from flask import Blueprint, request, jsonify
from backend.db_flask import get_db

plans_bp = Blueprint('plans', __name__)

USER_ID = 1  # hardcoded until auth is implemented


# GET /plans
# Returns all plans for the current user.
@plans_bp.get('/plans')
def get_plans():
    db = get_db()
    rows = db.execute(
        '''
        SELECT id, name, description, created_at
        FROM workout_plans
        WHERE user_id = ?
        ORDER BY created_at DESC
        ''',
        (USER_ID,)
    ).fetchall()
    return jsonify([dict(row) for row in rows])


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

    # Reshape flat rows into nested structure: plan -> days -> exercises
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
                'id':           day_id,
                'name':         r['day_name'],
                'day_of_week':  r['day_of_week'],
                'order':        r['order_in_plan'],
                'exercises':    []
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

    # Convert days dict to sorted list
    plan['days'] = sorted(plan['days'].values(), key=lambda d: d['order'])

    return jsonify(plan)


# POST /plans
# Body: {
#   "name": "...", "description": "...",
#   "days": [
#     { "name": "Push Day", "day_of_week": 1, "order_in_plan": 1,
#       "exercises": [{ "exercise_id": 1, "order_in_day": 1, "target_sets": 4, "target_reps": 8, "notes": "" }] }
#   ]
# }
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
                        plan_id,
                        day_id,
                        ex['exercise_id'],
                        ex['order_in_day'],
                        ex.get('target_sets'),
                        ex.get('target_reps'),
                        ex.get('notes'),
                    )
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
