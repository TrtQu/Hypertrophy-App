# Hypertrophy App

Mobile workout tracking app. Three-tier architecture: Expo/React Native frontend, Flask backend, SQLite data layer.

## Stack

- Frontend: Expo ~54, React Native 0.81.5, React 19, React Navigation v7 (bottom-tab nav)
- Backend: Python/Flask, blueprints (`workouts`, `exercises`, `plans`, `profile`), app factory pattern, Flask-CORS
- Database: SQLite (`hypertrophy.db`), schema via `schema.sql`, framework-agnostic connection helpers in `server/db.py`, Flask-specific `g`-object lifecycle in `backend/db_flask.py`

## Project Structure

- `/frontend` — Expo React Native app (screens, assets, `App.js`, `app.json`)
- `/backend` — Flask HTTP layer
  - `wsgi.py` — WSGI entrypoint (`flask --app backend.wsgi run`)
  - `app_factory.py` — `create_app()`
  - `db_flask.py` — Flask adapter around `server.db` (request-scoped connection caching)
  - `routes/` — blueprints, one per resource
- `/server` — data layer (no Flask dependency)
  - `db.py` — `connect()`, `init_schema()`, `load_seed()` usable by any Python script
  - `schema.sql`, `seed.sql`, `queries.sql`
  - `hypertrophy.db` — the SQLite file
  - `jobs/` — background jobs and one-off scripts

## Running

From the project root, with the virtualenv active:

```
flask --app backend.wsgi run --debug
flask --app backend.wsgi init-db
```

For frontend -> cd frontend, and:

```
npx expo start
```

## Current State

- Auth is token-based: `POST /auth/signup` and `POST /auth/login` return a signed user id (`backend/auth.py`); every other blueprint calls `require_login` in `before_request` and reads `g.user_id`. The frontend keeps the token in expo-secure-store and sends it via `frontend/api.js`
- `python tests/test_api.py` runs end-to-end checks against a throwaway seeded DB (no test framework needed)
- All backend routes (`/exercises`, `/workouts`, `/plans`, `/stats`, `/profile`) are fully wired to SQLite
- `HomeScreen` fetches live stats from `/stats` (streak, weekly count, today's split)
- `WorkoutsScreen` fetches and displays workout history from `/workouts`
- `ExerciseScreen` fetches exercises grouped by muscle group; supports search, category filter strip, add (with 2-level muscle picker, bilateral/unilateral toggle, optional notes), and delete
- `ProfileScreen` fetches user info + lifetime stats + personal records from `/profile`; supports editing username via `PATCH /profile`
- `exercises` table has `is_unilateral` (INTEGER DEFAULT 0) and `notes` (TEXT) columns added after initial schema — existing DBs need an `ALTER TABLE` migration (see below)
- `schema.sql` defines the full data model including `plan_days` table
- `seed.sql` has exercises across multiple muscle groups + a full PPL plan
- Run `flask --app backend.wsgi init-db` then reload `seed.sql` if `hypertrophy.db` is out of date

## DB Migration (exercises table)

If `hypertrophy.db` predates the `is_unilateral`/`notes` columns, run once from the project root:

```
python -c "
import sqlite3; conn = sqlite3.connect('server/hypertrophy.db')
conn.execute('ALTER TABLE exercises ADD COLUMN is_unilateral INTEGER NOT NULL DEFAULT 0')
conn.execute('ALTER TABLE exercises ADD COLUMN notes TEXT')
conn.commit(); conn.close(); print('Done')
"
```
