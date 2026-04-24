from flask import Blueprint, request, jsonify
from backend.db_flask import get_db

profile_bp = Blueprint('profile', __name__)

USER_ID = 1  # hardcoded until auth is implemented


# GET /profile
# Returns user info, lifetime stats, and personal records.
@profile_bp.get('/profile')
def get_profile():
    db = get_db()

    user = db.execute(
        'SELECT id, username, email, created_at FROM users WHERE id = ?',
        (USER_ID,)
    ).fetchone()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    total_workouts = db.execute(
        'SELECT COUNT(*) AS count FROM workouts WHERE user_id = ?',
        (USER_ID,)
    ).fetchone()['count']

    total_sets = db.execute(
        '''
        SELECT COUNT(*) AS count
        FROM sets s
        JOIN workouts w ON w.id = s.workout_id
        WHERE w.user_id = ?
        ''',
        (USER_ID,)
    ).fetchone()['count']

    fav_row = db.execute(
        '''
        SELECT e.muscle_group, COUNT(*) AS set_count
        FROM sets s
        JOIN exercises e ON e.id = s.exercise_id
        JOIN workouts w  ON w.id  = s.workout_id
        WHERE w.user_id = ? AND e.muscle_group IS NOT NULL
        GROUP BY e.muscle_group
        ORDER BY set_count DESC
        LIMIT 1
        ''',
        (USER_ID,)
    ).fetchone()

    pr_rows = db.execute(
        '''
        SELECT e.name AS exercise_name, e.muscle_group, MAX(s.weight) AS max_weight
        FROM sets s
        JOIN exercises e ON e.id = s.exercise_id
        JOIN workouts w  ON w.id = s.workout_id
        WHERE w.user_id = ? AND s.is_warmup = 0
        GROUP BY e.id
        ORDER BY max_weight DESC
        LIMIT 10
        ''',
        (USER_ID,)
    ).fetchall()

    return jsonify({
        'username':     user['username'],
        'email':        user['email'],
        'member_since': user['created_at'],
        'stats': {
            'total_workouts':  total_workouts,
            'total_sets':      total_sets,
            'favorite_muscle': fav_row['muscle_group'] if fav_row else None,
        },
        'prs': [dict(row) for row in pr_rows],
    })


# PATCH /profile
# Body: { "username": "..." }
@profile_bp.patch('/profile')
def update_profile():
    data = request.get_json()
    username = data.get('username', '').strip()

    if not username:
        return jsonify({'error': 'username is required'}), 400

    db = get_db()
    try:
        db.execute('UPDATE users SET username = ? WHERE id = ?', (username, USER_ID))
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500

    return jsonify({'username': username})
