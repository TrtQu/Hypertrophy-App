"""Token authentication.

Passwords are hashed with Werkzeug. The token is the user's id signed with
the app's SECRET_KEY, so there is no session table to keep and no server
state to expire — the signature carries its own timestamp.
"""

from flask import current_app, g, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.exceptions import Unauthorized

TOKEN_MAX_AGE = 60 * 60 * 24 * 30  # 30 days, in seconds


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="auth")


def make_token(user_id: int) -> str:
    return _serializer().dumps(user_id)


def current_user_id() -> int:
    """Read the user id out of the request's bearer token, or refuse."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise Unauthorized(description="Sign in first")
    try:
        return _serializer().loads(header[len("Bearer "):], max_age=TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        raise Unauthorized(description="Your session expired — sign in again")


def require_login():
    """Blueprint ``before_request`` hook: put the caller's id on ``g``."""
    if request.method != "OPTIONS":  # CORS preflight carries no token
        g.user_id = current_user_id()
