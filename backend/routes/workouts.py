from flask import Blueprint, request, jsonify
from backend.db_flask import get_db

workouts_bp = Blueprint('workouts', __name__)

USER_ID = 1  # hardcoded until auth is implemented


# GET /workouts
# Returns all workouts for the current user, newest first.
@workouts_bp.get('/workouts')
def get_workouts():
    db = get_db()
    rows = db.execute(
        '''
        SELECT id, workout_date, name, notes, plan_id, created_at
        FROM workouts
        WHERE user_id = ?
        ORDER BY workout_date DESC
        ''',
        (USER_ID,)
    ).fetchall()
    return jsonify([dict(row) for row in rows])


# GET /workouts/<id>
# Returns a single workout with all its sets and exercise info.
@workouts_bp.get('/workouts/<int:workout_id>')
def get_workout(workout_id):
    db = get_db()
    rows = db.execute(
        '''
        SELECT
            w.id            AS workout_id,
            w.workout_date,
            w.name          AS workout_name,
            w.notes         AS workout_notes,
            s.id            AS set_id,
            s.set_number,
            s.side,
            s.reps,
            s.weight,
            s.is_warmup,
            s.rpe,
            s.notes         AS set_notes,
            e.id            AS exercise_id,
            e.name          AS exercise_name,
            e.muscle_group
        FROM workouts w
        LEFT JOIN sets s      ON s.workout_id  = w.id
        LEFT JOIN exercises e ON e.id          = s.exercise_id
        WHERE w.id = ? AND w.user_id = ?
        ORDER BY e.name, s.set_number, s.side
        ''',
        (workout_id, USER_ID)
    ).fetchall()

    if not rows:
        return jsonify({'error': 'Workout not found'}), 404

    # First row has the workout header; all rows share it
    first = dict(rows[0])
    workout = {
        'id':           first['workout_id'],
        'workout_date': first['workout_date'],
        'name':         first['workout_name'],
        'notes':        first['workout_notes'],
        'sets':         []
    }

    for row in rows:
        r = dict(row)
        if r['set_id'] is not None:
            workout['sets'].append({
                'id':           r['set_id'],
                'exercise_id':  r['exercise_id'],
                'exercise_name':r['exercise_name'],
                'muscle_group': r['muscle_group'],
                'set_number':   r['set_number'],
                'side':         r['side'],
                'reps':         r['reps'],
                'weight':       r['weight'],
                'is_warmup':    bool(r['is_warmup']),
                'rpe':          r['rpe'],
                'notes':        r['set_notes'],
            })

    return jsonify(workout)


# POST /workouts
# Body: { "workout_date": "YYYY-MM-DD", "name": "...", "notes": "...", "plan_id": null,
#         "sets": [{ "exercise_id": 1, "set_number": 1, "side": "both",
#                    "reps": 8, "weight": 135, "is_warmup": false, "rpe": null, "notes": "" }] }
@workouts_bp.post('/workouts')
def create_workout():
    data = request.get_json()
    workout_date = data.get('workout_date')
    name         = data.get('name', '').strip() or None
    notes        = data.get('notes', '').strip() or None
    plan_id      = data.get('plan_id')
    sets         = data.get('sets', [])

    if not workout_date:
        return jsonify({'error': 'workout_date is required'}), 400

    db = get_db()
    try:
        cursor = db.execute(
            '''
            INSERT INTO workouts (user_id, workout_date, name, notes, plan_id, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ''',
            (USER_ID, workout_date, name, notes, plan_id)
        )
        workout_id = cursor.lastrowid

        for s in sets:
            db.execute(
                '''
                INSERT INTO sets
                    (workout_id, exercise_id, set_number, side, reps, weight, is_warmup, rpe, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ''',
                (
                    workout_id,
                    s['exercise_id'],
                    s['set_number'],
                    s.get('side', 'both'),
                    s['reps'],
                    s['weight'],
                    1 if s.get('is_warmup') else 0,
                    s.get('rpe'),
                    s.get('notes'),
                )
            )

        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({'id': workout_id}), 201


# DELETE /workouts/<id>
@workouts_bp.delete('/workouts/<int:workout_id>')
def delete_workout(workout_id):
    db = get_db()
    try:
        db.execute('DELETE FROM sets WHERE workout_id = ?', (workout_id,))
        db.execute('DELETE FROM workouts WHERE id = ? AND user_id = ?', (workout_id, USER_ID))
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({'deleted': workout_id})


# GET /stats
# Returns home screen stats: weekly workouts, streak, and today's plan day.
@workouts_bp.get('/stats')
def get_stats():
    db = get_db()

    # Weekly workout count
    weekly_row = db.execute(
        '''
        SELECT COUNT(*) AS count
        FROM workouts
        WHERE user_id = ?
          AND strftime('%Y-%W', workout_date) = strftime('%Y-%W', 'now')
        ''',
        (USER_ID,)
    ).fetchone()
    workouts_this_week = weekly_row['count']

    # Streak — fetch all distinct dates descending, compute in Python
    date_rows = db.execute(
        '''
        SELECT DISTINCT workout_date
        FROM workouts
        WHERE user_id = ?
        ORDER BY workout_date DESC
        ''',
        (USER_ID,)
    ).fetchall()

    from datetime import date, timedelta
    streak = 0
    today = date.today()
    expected = today
    for row in date_rows:
        workout_date = date.fromisoformat(row['workout_date'])
        if workout_date == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif workout_date < expected:
            break

    # Today's plan day
    today_row = db.execute(
        '''
        SELECT pd.id AS day_id, pd.name AS day_name, wp.id AS plan_id, wp.name AS plan_name
        FROM workout_plans wp
        JOIN plan_days pd ON pd.plan_id = wp.id
        WHERE wp.user_id = ?
          AND pd.day_of_week = CAST(strftime('%w', 'now') AS INTEGER)
        ORDER BY wp.created_at DESC
        LIMIT 1
        ''',
        (USER_ID,)
    ).fetchone()

    return jsonify({
        'workouts_this_week': workouts_this_week,
        'streak':             streak,
        'todays_split':       dict(today_row) if today_row else None,
    })
