-- =====================================================================
-- queries.sql — Reference queries for backend route implementation
-- Each query is labeled with the route it belongs to.
-- All queries use ? as the SQLite parameter placeholder.
-- =====================================================================


-- =====================================================================
-- EXERCISES
-- =====================================================================

-- GET /exercises
-- Fetch all exercises for a given user.
SELECT id, name, muscle_group, created_at
FROM exercises
WHERE user_id = ?
ORDER BY muscle_group, name;

-- POST /exercises
-- Insert a new exercise for a user. Check UNIQUE(user_id, name) constraint.
INSERT INTO exercises (user_id, name, muscle_group, created_at)
VALUES (?, ?, ?, datetime('now'));

-- DELETE /exercises/<id>
-- Only delete if the exercise belongs to the requesting user.
DELETE FROM exercises
WHERE id = ? AND user_id = ?;


-- =====================================================================
-- WORKOUTS
-- =====================================================================

-- GET /workouts
-- Fetch all workouts for a user, most recent first.
SELECT id, workout_date, name, notes, plan_id, created_at
FROM workouts
WHERE user_id = ?
ORDER BY workout_date DESC;

-- GET /workouts/<id>
-- Fetch a single workout with all its sets and exercise names.
SELECT
    w.id            AS workout_id,
    w.workout_date,
    w.name          AS workout_name,
    w.notes         AS workout_notes,
    s.id            AS set_id,
    s.set_number,
    s.side,
    s.reps,
    s.weight,
    s.is_warmup,
    s.rpe,
    s.notes         AS set_notes,
    e.id            AS exercise_id,
    e.name          AS exercise_name,
    e.muscle_group
FROM workouts w
LEFT JOIN sets s         ON s.workout_id  = w.id
LEFT JOIN exercises e    ON e.id          = s.exercise_id
WHERE w.id = ? AND w.user_id = ?
ORDER BY e.name, s.set_number, s.side;

-- POST /workouts
-- Step 1: Insert the workout header.
INSERT INTO workouts (user_id, workout_date, name, notes, plan_id, created_at)
VALUES (?, ?, ?, ?, ?, datetime('now'));
-- Step 2: Use last_insert_rowid() as workout_id, then insert each set:
INSERT INTO sets (workout_id, exercise_id, set_number, side, reps, weight, is_warmup, rpe, notes, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
-- NOTE: Wrap both steps in a transaction so a partial write never persists.

-- DELETE /workouts/<id>
-- Cascading delete: remove sets first, then the workout.
DELETE FROM sets    WHERE workout_id = ?;
DELETE FROM workouts WHERE id = ? AND user_id = ?;
-- NOTE: Also wrap in a transaction.


-- =====================================================================
-- WORKOUT PLANS
-- =====================================================================

-- GET /plans
-- Fetch all plans for a user.
SELECT id, name, description, created_at
FROM workout_plans
WHERE user_id = ?
ORDER BY created_at DESC;

-- GET /plans/<id>
-- Fetch a full plan: all days and their exercises with targets.
SELECT
    wp.id           AS plan_id,
    wp.name         AS plan_name,
    wp.description,
    pd.id           AS day_id,
    pd.name         AS day_name,
    pd.day_of_week,
    pd.order_in_plan,
    pe.id           AS plan_exercise_id,
    pe.order_in_day,
    pe.target_sets,
    pe.target_reps,
    pe.notes        AS exercise_notes,
    e.id            AS exercise_id,
    e.name          AS exercise_name,
    e.muscle_group
FROM workout_plans wp
JOIN plan_days pd        ON pd.plan_id    = wp.id
JOIN plan_exercises pe   ON pe.day_id     = pd.id
JOIN exercises e         ON e.id          = pe.exercise_id
WHERE wp.id = ? AND wp.user_id = ?
ORDER BY pd.order_in_plan, pe.order_in_day;

-- POST /plans
-- Step 1: Insert the plan.
INSERT INTO workout_plans (user_id, name, description, created_at)
VALUES (?, ?, ?, datetime('now'));
-- Step 2: Insert each day.
INSERT INTO plan_days (plan_id, name, day_of_week, order_in_plan)
VALUES (?, ?, ?, ?);
-- Step 3: Insert exercises per day.
INSERT INTO plan_exercises (plan_id, day_id, exercise_id, order_in_day, target_sets, target_reps, notes)
VALUES (?, ?, ?, ?, ?, ?, ?);


-- =====================================================================
-- HOME SCREEN STATS  (for the dashboard)
-- =====================================================================

-- Weekly completion: count workouts logged in the current ISO week.
SELECT COUNT(*) AS workouts_this_week
FROM workouts
WHERE user_id = ?
  AND strftime('%Y-%W', workout_date) = strftime('%Y-%W', 'now');

-- Current streak: consecutive days with a workout up to and including today.
-- SQLite doesn't have window functions in older builds, so do this in Python:
-- 1. SELECT DISTINCT workout_date FROM workouts WHERE user_id = ? ORDER BY workout_date DESC
-- 2. Walk the list in Python, count consecutive days from today backwards.

-- Today's plan day: find which plan_day matches today's day_of_week for the user's active plan.
-- (Assumes one active plan per user for now — extend when multi-plan support is added.)
SELECT
    pd.id        AS day_id,
    pd.name      AS day_name,
    wp.id        AS plan_id,
    wp.name      AS plan_name
FROM workout_plans wp
JOIN plan_days pd ON pd.plan_id = wp.id
WHERE wp.user_id = ?
  AND pd.day_of_week = CAST(strftime('%w', 'now') AS INTEGER)
ORDER BY wp.created_at DESC
LIMIT 1;
