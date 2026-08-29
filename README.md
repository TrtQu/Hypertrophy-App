# Hypertrophy App

A workout tracker for strength training. You build routines, log the sets you
do, and see your history and personal records.

It is a phone app (Expo / React Native) talking to a small Flask API that
stores everything in a local SQLite file. Everything runs on your own machine —
there is no hosted server.

## What you can do

- **Sign in** — create an account with an email, username, and password, or
  sign in to one you already have. The app remembers you until you sign out.
- **Exercises** — browse exercises by muscle group, search them, add your own
  (with a muscle picker, a bilateral/unilateral flag, and notes), delete them.
- **Routines** — create a training plan, add exercises to its days, set target
  sets and reps, remove exercises, delete the plan.
- **Home** — see your current streak, how many workouts you did this week, and
  which plan day falls on today.
- **Profile** — your username, lifetime totals, and personal records. You can
  rename yourself.
- **Settings** — switch between metric and imperial, set a rest timer and a
  default weight increment, sign out.

## How it is put together

```
frontend/   Expo app. One screen file per tab, api.js for backend calls,
            context/ for the signed-in user and app-wide preferences.
            config.js holds the API address.
backend/    Flask HTTP layer. app_factory.py builds the app, routes/ has one
            blueprint per resource, auth.py checks tokens, db_flask.py opens a
            connection per request.
server/     Data layer, no Flask. db.py connects and applies schema.sql and
            seed.sql. hypertrophy.db is the database file. jobs/ is for
            background scripts.
tests/      End-to-end checks against a throwaway database.
docs/       Notes on the schema and the queries.
```

The split between `backend/` and `server/` is deliberate: anything in `server/`
can be imported by a plain Python script, so migrations and one-off data jobs
do not need Flask running.

### Data model

`users` own `exercises`, `workout_plans`, and `workouts`. A plan holds
`plan_days` (for example "Push Day"), and each day holds `plan_exercises` with
target sets and reps. A logged `workout` holds `sets`, and each set records
reps, weight, side (left/right/both), whether it was a warmup, and an optional
RPE. A workout can point at a plan or stand alone. Full DDL is in
[schema.sql](server/schema.sql).

### Signing in

`POST /auth/signup` and `POST /auth/login` return a token. Every other route
needs it in an `Authorization: Bearer <token>` header, and answers `401` without
one. The token is the user's id signed with the app's `SECRET_KEY`, so there is
no session table to keep; it is good for 30 days. Passwords are stored as
Werkzeug scrypt hashes.

The frontend keeps the token in the device's secure store and attaches it to
every request through [api.js](frontend/api.js). You only see the sign-in
screen when there is no valid token.

### API

| Method | Path | Does |
| --- | --- | --- |
| POST | `/auth/signup` | Create an account, return a token |
| POST | `/auth/login` | Sign in, return a token |
| GET | `/exercises` | List exercises, ordered by muscle group |
| POST | `/exercises` | Add an exercise |
| DELETE | `/exercises/<id>` | Delete an exercise and its sets |
| GET | `/plans` | List plans |
| GET | `/plans/<id>` | One plan |
| GET | `/plans/<id>/detail` | Plan with days, exercises, and targets |
| POST | `/plans` | Create a plan |
| PUT | `/plans/<id>/sets` | Update target sets and reps |
| POST | `/plans/<id>/exercises` | Add an exercise to a plan |
| DELETE | `/plans/<id>/exercises/<plan_exercise_id>` | Remove one |
| DELETE | `/plans/<id>` | Delete a plan |
| GET | `/workouts` | Workout history, newest first |
| GET | `/workouts/<id>` | One workout with all its sets |
| POST | `/workouts` | Log a workout and its sets |
| DELETE | `/workouts/<id>` | Delete a workout |
| GET | `/stats` | Streak, weekly count, today's plan day |
| GET | `/profile` | User, lifetime stats, personal records |
| PATCH | `/profile` | Change the username |

Every route works only on the signed-in user's own rows. Asking for someone
else's plan or workout returns `404`.

## Running it

### Backend

From the project root, with your virtualenv active:

```
pip install -r requirements.txt
flask --app backend.wsgi init-db     # create the tables
flask --app backend.wsgi seed-db     # load sample exercises and a PPL plan
flask --app backend.wsgi run --debug -p 5001
```

`init-db` wipes and recreates the schema. Only run it on a database you are
willing to lose.

The seeded account is `test@test.com` with the password `password123`. Set
`SECRET_KEY` in the environment before you run the app anywhere but your own
machine — the built-in default signs guessable tokens.

### Frontend

The app reaches the API over your local network, so `localhost` will not work
from a phone. Find your machine's IPv4 address (`ipconfig` on Windows,
`ifconfig` on Mac or Linux) and put it in
[frontend/config.js](frontend/config.js), matching the port the backend is
serving on.

```
cd frontend
npm install
npx expo start
```

Then scan the QR code with Expo Go, or press `a` / `i` for an emulator.

### Tests

[tests/test_api.py](tests/test_api.py) drives the whole API against a fresh
seeded database: sign-up and sign-in, the rules each route enforces, and the
checks that keep one account out of another's data. It needs no test framework.

```
python tests/test_api.py
```
