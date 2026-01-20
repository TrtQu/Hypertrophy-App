import os
import sqlite3
from flask import g, current_app

# Get DB connection
def get_db():
    if "db" not in g:
        db_path = current_app.config["DATABASE"]
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        g.db = conn
    return g.db

# Close DB connection
def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

# Initialize DB
def init_db():
    db = get_db()
    schema_path = os.path.join(current_app.root_path, "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        db.executescript(f.read())
    db.commit()
