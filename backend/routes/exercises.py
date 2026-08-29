from flask import Blueprint, g, request, jsonify

from backend.auth import require_login
from backend.db_flask import get_db

exercises_bp = Blueprint('exercises', __name__)
exercises_bp.before_request(require_login)


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
        (g.user_id,)
    ).fetchall()
    return jsonify([dict(row) for row in rows])


# POST /exercises
# Body: { "name": "...", "muscle_group": "...", "is_unilateral": false, "notes": "..." }
@exercises_bp.post('/exercises')
def create_exercise():
    data = request.get_json()
    name          = (data.get('name') or '').strip()
    muscle_group  = (data.get('muscle_group') or '').strip() or None
    is_unilateral = 1 if data.get('is_unilateral') else 0
    notes         = (data.get('notes') or '').strip() or None

    if not name:
        return jsonify({'error': 'name is required'}), 400

    db = get_db()
    try:
        cursor = db.execute(
            '''
            INSERT INTO exercises (user_id, name, muscle_group, is_unilateral, notes, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ''',
            (g.user_id, name, muscle_group, is_unilateral, notes)
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

    owned = db.execute(
        'SELECT id FROM exercises WHERE id = ? AND user_id = ?',
        (exercise_id, g.user_id)
    ).fetchone()

    if not owned:
        return jsonify({'error': 'Exercise not found'}), 404

    db.execute('DELETE FROM plan_exercises WHERE exercise_id = ?', (exercise_id,))
    db.execute('DELETE FROM sets WHERE exercise_id = ?', (exercise_id,))
    db.execute('DELETE FROM exercises WHERE id = ? AND user_id = ?', (exercise_id, g.user_id))
    db.commit()
    return jsonify({'deleted': exercise_id})
