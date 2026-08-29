import sqlite3

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from backend.auth import make_token
from backend.db_flask import get_db

auth_bp = Blueprint('auth', __name__)

MIN_PASSWORD_LENGTH = 8


# POST /auth/signup
# Body: { "email": "...", "password": "...", "username": "..." }
@auth_bp.post('/auth/signup')
def signup():
    data     = request.get_json(silent=True) or {}
    email    = (data.get('email') or '').strip().lower()
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not email or not username:
        return jsonify({'error': 'email and username are required'}), 400
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({'error': f'password must be at least {MIN_PASSWORD_LENGTH} characters'}), 400

    db = get_db()
    try:
        cursor = db.execute(
            '''
            INSERT INTO users (email, password_hash, username, created_at)
            VALUES (?, ?, ?, datetime('now'))
            ''',
            (email, generate_password_hash(password), username)
        )
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        return jsonify({'error': 'That email or username is already taken'}), 409

    return jsonify({'token': make_token(cursor.lastrowid), 'username': username}), 201


# POST /auth/login
# Body: { "email": "...", "password": "..." }
@auth_bp.post('/auth/login')
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    user = get_db().execute(
        'SELECT id, username, password_hash FROM users WHERE email = ?',
        (email,)
    ).fetchone()

    # Same message either way, so a stranger cannot learn which emails exist.
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Wrong email or password'}), 401

    return jsonify({'token': make_token(user['id']), 'username': user['username']})
