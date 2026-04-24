from flask import Blueprint, request, jsonify
from backend.db_flask import get_db

exercises_bp = Blueprint('exercises', __name__)

USER_ID = 1  # hardcoded until auth is implemented


# GET /exercises
# Returns all exercises for the current user, grouped by muscle group.
@exercises_bp.get('/exercises')
def get_exercises():
    db = get_db()
    rows = db.execute(
        '''
        SELECT id, name, muscle_group, is_unilateral, notes, created_at
        FROM exercises
        WHERE user_id = ?
        ORDER BY muscle_group, name
        ''',
        (USER_ID,)
    ).fetchall()
    return jsonify([dict(row) for row in rows])


# POST /exercises
# Body: { "name": "...", "muscle_group": "...", "is_unilateral": false, "notes": "..." }
@exercises_bp.post('/exercises')
def create_exercise():
    data = request.get_json()
    name          = data.get('name', '').strip()
    muscle_group  = data.get('muscle_group', '').strip() or None
    is_unilateral = 1 if data.get('is_unilateral') else 0
    notes         = data.get('notes', '').strip() or None

    if not name:
        return jsonify({'error': 'name is required'}), 400

    db = get_db()
    try:
        cursor = db.execute(
            '''
            INSERT INTO exercises (user_id, name, muscle_group, is_unilateral, notes, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ''',
            (USER_ID, name, muscle_group, is_unilateral, notes)
        )
        db.commit()
        new_id = cursor.lastrowid
    except Exception:
        return jsonify({'error': f"Exercise '{name}' already exists"}), 409

    return jsonify({
        'id': new_id, 'name': name,
        'muscle_group': muscle_group,
        'is_unilateral': bool(is_unilateral),
        'notes': notes,
    }), 201


# DELETE /exercises/<id>
@exercises_bp.delete('/exercises/<int:exercise_id>')
def delete_exercise(exercise_id):
    db = get_db()
    db.execute(
        'DELETE FROM exercises WHERE id = ? AND user_id = ?',
        (exercise_id, USER_ID)
    )
    db.commit()
    return jsonify({'deleted': exercise_id})
