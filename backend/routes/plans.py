from flask import Blueprint, request, jsonify
from backend.db_flask import get_db

plans_bp = Blueprint('plans', __name__)

USER_ID = 1  # hardcoded until auth is implemented


# GET /plans
# Returns all plans with their exercise list for the card view.
@plans_bp.get('/plans')
def get_plans():
    db = get_db()

    plan_rows = db.execute(
        '''
        SELECT id, name, description, created_at
        FROM workout_plans
        WHERE user_id = ?
        ORDER BY created_at DESC
        ''',
        (USER_ID,)
    ).fetchall()

    if not plan_rows:
        return jsonify([])

    plan_ids = [r['id'] for r in plan_rows]

    # Fetch all exercises for these plans in one query
    ex_rows = db.execute(
        f'''
        SELECT pe.plan_id, pe.id AS plan_exercise_id,
               e.id AS exercise_id, e.name, e.muscle_group
        FROM plan_exercises pe
        JOIN plan_days pd ON pd.id = pe.day_id
        JOIN exercises e  ON e.id  = pe.exercise_id
        WHERE pe.plan_id IN ({",".join("?" * len(plan_ids))})
        ORDER BY pe.plan_id, pd.order_in_plan, pe.order_in_day
        ''',
        plan_ids
    ).fetchall()

    exercises_by_plan = {}
    for row in ex_rows:
        pid = row['plan_id']
        exercises_by_plan.setdefault(pid, []).append({
            'plan_exercise_id': row['plan_exercise_id'],
            'exercise_id':      row['exercise_id'],
            'name':             row['name'],
            'muscle_group':     row['muscle_group'],
        })

    result = []
    for plan in plan_rows:
        d = dict(plan)
        d['exercises'] = exercises_by_plan.get(d['id'], [])
        result.append(d)

    return jsonify(result)


# GET /plans/<id>
# Returns a full plan with days and exercises nested inside each day.
@plans_bp.get('/plans/<int:plan_id>')
def get_plan(plan_id):
    db = get_db()
    rows = db.execute(
        '''
        SELECT
            wp.id           AS plan_id,
            wp.name         AS plan_name,
            wp.description,
            pd.id           AS day_id,
            pd.name         AS day_name,
            pd.day_of_week,
            pd.order_in_plan,
            pe.id           AS plan_exercise_id,
            pe.order_in_day,
            pe.target_sets,
            pe.target_reps,
            pe.notes        AS exercise_notes,
            e.id            AS exercise_id,
            e.name          AS exercise_name,
            e.muscle_group
        FROM workout_plans wp
        JOIN plan_days pd      ON pd.plan_id  = wp.id
        JOIN plan_exercises pe ON pe.day_id   = pd.id
        JOIN exercises e       ON e.id        = pe.exercise_id
        WHERE wp.id = ? AND wp.user_id = ?
        ORDER BY pd.order_in_plan, pe.order_in_day
        ''',
        (plan_id, USER_ID)
    ).fetchall()

    if not rows:
        return jsonify({'error': 'Plan not found'}), 404

    first = dict(rows[0])
    plan = {
        'id':          first['plan_id'],
        'name':        first['plan_name'],
        'description': first['description'],
        'days':        {}
    }

    for row in rows:
        r = dict(row)
        day_id = r['day_id']

        if day_id not in plan['days']:
            plan['days'][day_id] = {
                'id':          day_id,
                'name':        r['day_name'],
                'day_of_week': r['day_of_week'],
                'order':       r['order_in_plan'],
                'exercises':   []
            }

        plan['days'][day_id]['exercises'].append({
            'plan_exercise_id': r['plan_exercise_id'],
            'exercise_id':      r['exercise_id'],
            'name':             r['exercise_name'],
            'muscle_group':     r['muscle_group'],
            'order':            r['order_in_day'],
            'target_sets':      r['target_sets'],
            'target_reps':      r['target_reps'],
            'notes':            r['exercise_notes'],
        })

    plan['days'] = sorted(plan['days'].values(), key=lambda d: d['order'])
    return jsonify(plan)


# GET /plans/<id>/detail
# Screen-specific shape: flat exercises list, sets expanded from target_sets,
# and previous performance pulled from workout history.
@plans_bp.get('/plans/<int:plan_id>/detail')
def get_plan_detail(plan_id):
    db = get_db()

    plan = db.execute(
        'SELECT id, name FROM workout_plans WHERE id = ? AND user_id = ?',
        (plan_id, USER_ID)
    ).fetchone()

    if not plan:
        return jsonify({'error': 'Plan not found'}), 404

    ex_rows = db.execute(
        '''
        SELECT pe.id AS plan_exercise_id, pe.target_sets, pe.target_reps,
               e.id AS exercise_id, e.name, e.muscle_group
        FROM plan_exercises pe
        JOIN plan_days pd ON pd.id = pe.day_id
        JOIN exercises e  ON e.id  = pe.exercise_id
        WHERE pe.plan_id = ?
        ORDER BY pd.order_in_plan, pe.order_in_day
        ''',
        (plan_id,)
    ).fetchall()

    exercises = []
    for row in ex_rows:
        r = dict(row)
        target_sets = r['target_sets'] or 3
        target_reps = r['target_reps']

        # Expand target_sets into individual set objects
        sets = [
            {'set_number': i + 1, 'target_reps': target_reps, 'target_weight': None}
            for i in range(target_sets)
        ]

        # Most recent actual sets for this exercise (for the "Previous" column)
        prev_rows = db.execute(
            '''
            SELECT s.set_number, s.reps, s.weight
            FROM sets s
            JOIN workouts w ON w.id = s.workout_id
            WHERE w.user_id = ? AND s.exercise_id = ?
              AND s.is_warmup = 0 AND s.side IN ('both', 'right')
            ORDER BY w.workout_date DESC, s.set_number
            LIMIT 20
            ''',
            (USER_ID, r['exercise_id'])
        ).fetchall()

        # Keep only the most recent session's sets (stop at the first repeated set_number)
        previous = []
        seen = set()
        for p in prev_rows:
            if p['set_number'] in seen:
                break
            seen.add(p['set_number'])
            previous.append({'set_number': p['set_number'], 'reps': p['reps'], 'weight': p['weight']})

        exercises.append({
            'plan_exercise_id': r['plan_exercise_id'],
            'exercise_id':      r['exercise_id'],
            'name':             r['name'],
            'muscle_group':     r['muscle_group'],
            'sets':             sets,
            'previous':         previous,
        })

    return jsonify({'id': plan['id'], 'name': plan['name'], 'exercises': exercises})


# PUT /plans/<id>/sets
# Saves edited set targets back to plan_exercises.
# Body: { "exercises": [{ "plan_exercise_id": 1,
#           "sets": [{ "set_number": 1, "target_reps": 8, "target_weight": null }] }] }
@plans_bp.put('/plans/<int:plan_id>/sets')
def update_plan_sets(plan_id):
    data = request.get_json()
    exercises = data.get('exercises', [])

    db = get_db()

    plan = db.execute(
        'SELECT id FROM workout_plans WHERE id = ? AND user_id = ?',
        (plan_id, USER_ID)
    ).fetchone()

    if not plan:
        return jsonify({'error': 'Plan not found'}), 404

    try:
        for ex in exercises:
            plan_exercise_id = ex['plan_exercise_id']
            sets = ex.get('sets', [])
            target_sets = len(sets)
            # Store the first set's reps as the target (schema is per-exercise, not per-set)
            target_reps = sets[0].get('target_reps') if sets else None

            db.execute(
                '''
                UPDATE plan_exercises
                SET target_sets = ?, target_reps = ?
                WHERE id = ? AND plan_id = ?
                ''',
                (target_sets, target_reps, plan_exercise_id, plan_id)
            )

        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({'ok': True})


# POST /plans/<id>/exercises
# Adds an exercise to the plan's first day.
# Body: { "exercise_id": 1, "target_sets": 3, "target_reps": 10, "target_weight": null }
@plans_bp.post('/plans/<int:plan_id>/exercises')
def add_exercise_to_plan(plan_id):
    data = request.get_json()
    exercise_id = data.get('exercise_id')
    target_sets = data.get('target_sets', 3)
    target_reps = data.get('target_reps')

    if not exercise_id:
        return jsonify({'error': 'exercise_id is required'}), 400

    db = get_db()

    plan = db.execute(
        'SELECT id FROM workout_plans WHERE id = ? AND user_id = ?',
        (plan_id, USER_ID)
    ).fetchone()

    if not plan:
        return jsonify({'error': 'Plan not found'}), 404

    # Use the plan's first day
    day = db.execute(
        'SELECT id FROM plan_days WHERE plan_id = ? ORDER BY order_in_plan LIMIT 1',
        (plan_id,)
    ).fetchone()

    if not day:
        return jsonify({'error': 'Plan has no days'}), 400

    # Place at end of the day's exercise list
    max_order = db.execute(
        'SELECT COALESCE(MAX(order_in_day), 0) AS m FROM plan_exercises WHERE day_id = ?',
        (day['id'],)
    ).fetchone()['m']

    try:
        cursor = db.execute(
            '''
            INSERT INTO plan_exercises (plan_id, day_id, exercise_id, order_in_day, target_sets, target_reps)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (plan_id, day['id'], exercise_id, max_order + 1, target_sets, target_reps)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({'id': cursor.lastrowid}), 201


# DELETE /plans/<id>/exercises/<plan_exercise_id>
# Removes a single exercise from a plan.
@plans_bp.delete('/plans/<int:plan_id>/exercises/<int:plan_exercise_id>')
def remove_exercise_from_plan(plan_id, plan_exercise_id):
    db = get_db()
    try:
        db.execute(
            'DELETE FROM plan_exercises WHERE id = ? AND plan_id = ?',
            (plan_exercise_id, plan_id)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({'deleted': plan_exercise_id})


# POST /plans
# Body: { "name": "...", "description": "...", "days": [...] }
@plans_bp.post('/plans')
def create_plan():
    data = request.get_json()
    name        = data.get('name', '').strip()
    description = data.get('description', '').strip() or None
    days        = data.get('days', [])

    if not name:
        return jsonify({'error': 'name is required'}), 400

    db = get_db()
    try:
        cursor = db.execute(
            '''
            INSERT INTO workout_plans (user_id, name, description, created_at)
            VALUES (?, ?, ?, datetime('now'))
            ''',
            (USER_ID, name, description)
        )
        plan_id = cursor.lastrowid

        if days:
            for day in days:
                day_cursor = db.execute(
                    '''
                    INSERT INTO plan_days (plan_id, name, day_of_week, order_in_plan)
                    VALUES (?, ?, ?, ?)
                    ''',
                    (plan_id, day['name'], day.get('day_of_week'), day['order_in_plan'])
                )
                day_id = day_cursor.lastrowid

                for ex in day.get('exercises', []):
                    db.execute(
                        '''
                        INSERT INTO plan_exercises
                            (plan_id, day_id, exercise_id, order_in_day, target_sets, target_reps, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''',
                        (
                            plan_id, day_id,
                            ex['exercise_id'], ex['order_in_day'],
                            ex.get('target_sets'), ex.get('target_reps'), ex.get('notes'),
                        )
                    )
        else:
            # New routine created with no days — auto-create one default day so
            # POST /plans/<id>/exercises has somewhere to attach exercises.
            db.execute(
                '''
                INSERT INTO plan_days (plan_id, name, day_of_week, order_in_plan)
                VALUES (?, ?, NULL, 1)
                ''',
                (plan_id, name)
            )

        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({'id': plan_id}), 201


# DELETE /plans/<id>
@plans_bp.delete('/plans/<int:plan_id>')
def delete_plan(plan_id):
    db = get_db()
    try:
        db.execute('DELETE FROM plan_exercises WHERE plan_id = ?', (plan_id,))
        db.execute('DELETE FROM plan_days WHERE plan_id = ?', (plan_id,))
        db.execute('DELETE FROM workout_plans WHERE id = ? AND user_id = ?', (plan_id, USER_ID))
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({'deleted': plan_id})
