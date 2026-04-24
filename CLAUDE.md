# Hypertrophy App

Mobile workout tracking app. Three-tier architecture: Expo/React Native frontend, Flask backend, SQLite data layer.

## Stack

- Frontend: Expo ~54, React Native 0.81.5, React 19, React Navigation v7 (bottom-tab nav)
- Backend: Python/Flask, blueprints (`workouts`, `exercises`, `plans`), app factory pattern, Flask-CORS
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

- Flask routes exist but some return placeholder strings — next step is wiring them to real SQLite calls using the queries in `server/queries.sql`
- `schema.sql` defines the full data model including `plan_days` table
- `seed.sql` has 9 exercises across 5 muscle groups + a full PPL plan
- Run `flask --app backend.wsgi init-db` then reload `seed.sql` if `hypertrophy.db` is out of date
