"""
Flask adapter around ``server.db``.

Blueprints should import ``get_db`` from this module. It caches the
connection on Flask's ``g`` so that a single request shares one
connection, and registers ``close_db`` as the teardown handler.
"""

from flask import g, current_app

from server import db as server_db


def get_db():
    """Return a per-request SQLite connection, opening one if needed."""
    if "db" not in g:
        db_path = current_app.config["DATABASE"]
        g.db = server_db.connect(db_path)
    return g.db


def close_db(e=None):
    """Close the per-request SQLite connection, if one was opened."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Initialize the schema on the app's configured database."""
    db = get_db()
    server_db.init_schema(db)