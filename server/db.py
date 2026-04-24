"""
Framework-agnostic SQLite access for the hypertrophy database.

This module has no Flask dependency so that background jobs, migration
scripts, and one-off data tools can import it directly. The Flask
adapter lives in ``backend/db_flask.py`` and takes care of the
request-scoped connection caching via Flask's ``g`` object.
"""

import os
import sqlite3

# Project root is two levels up from this file: server/db.py -> server/ -> project root
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))

DEFAULT_DB_PATH = os.path.join(_SERVER_DIR, "hypertrophy.db")
SCHEMA_PATH = os.path.join(_SERVER_DIR, "schema.sql")
SEED_PATH = os.path.join(_SERVER_DIR, "seed.sql")


def connect(db_path: str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """Open a SQLite connection with the project's standard settings."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_schema(conn: sqlite3.Connection, schema_path: str = SCHEMA_PATH) -> None:
    """Apply schema.sql to the given connection."""
    with open(schema_path, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()


def load_seed(conn: sqlite3.Connection, seed_path: str = SEED_PATH) -> None:
    """Apply seed.sql to the given connection."""
    with open(seed_path, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()
