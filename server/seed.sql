-- =====================
-- Seed data for development/testing
-- =====================

-- Clear existing data in reverse dependency order
DELETE FROM sets;
DELETE FROM workouts;
DELETE FROM plan_exercises;
DELETE FROM plan_days;
DELETE FROM workout_plans;
DELETE FROM exercises;
DELETE FROM users;

-- Reset autoincrement counters so IDs are predictable
DELETE FROM sqlite_sequence WHERE name IN (
  'users','exercises','workout_plans','plan_days','plan_exercises',
  'workouts','sets'
);

-- =====================
-- Users
-- Sign in as test@test.com with the password "password123".
-- The hash below is Werkzeug scrypt; it is sample data, not a secret.
-- =====================
INSERT INTO users (email, password_hash, username, created_at)
VALUES (
  'test@test.com',
  'scrypt:32768:8:1$QB2XFcQsPAm1iibu$56d9edf920f093dad07208eebb7b69b8e1c4b709b0b299da0dc77f96ba2a63f6d6bc0828aaffd3667cdc6cfb0abbcd65cae54ad500330d0350d6d0633815d8db',
  'testuser',
  datetime('now')
);

-- =====================
-- Exercises
-- id  name                        muscle_group
--  1  Bench Press                 Chest
--  2  Incline DB Press            Chest
--  3  Flat DB Press               Chest
--  4  Pec Fly                     Chest
--  5  Overhead Press              Shoulders
--  6  Lateral Raise               Shoulders
--  7  Shoulder Plated Press       Shoulders
--  8  Pull Up                     Back
--  9  Barbell Row                 Back
-- 10  Dumbbell Curl               Biceps
-- 11  Bayesian Curl               Biceps
-- 12  Incline Curl                Biceps
-- 13  Preacher Curl               Biceps
-- 14  Tricep Pushdown             Triceps
-- 15  Overhead Tricep Extension   Triceps
-- 16  Tricep Extension            Triceps
-- 17  Squat                       Quads
-- 18  Romanian Deadlift           Hamstrings
-- =====================
INSERT INTO exercises (user_id, name, muscle_group, is_unilateral, created_at) VALUES
  (1, 'Bench Press',               'Chest',      0, datetime('now')),
  (1, 'Incline DB Press',          'Chest',      0, datetime('now')),
  (1, 'Flat DB Press',             'Chest',      0, datetime('now')),
  (1, 'Pec Fly',                   'Chest',      0, datetime('now')),
  (1, 'Overhead Press',            'Shoulders',  0, datetime('now')),
  (1, 'Lateral Raise',             'Shoulders',  0, datetime('now')),
  (1, 'Shoulder Plated Press',     'Shoulders',  0, datetime('now')),
  (1, 'Pull Up',                   'Back',       0, datetime('now')),
  (1, 'Barbell Row',               'Back',       0, datetime('now')),
  (1, 'Dumbbell Curl',             'Biceps',     1, datetime('now')),
  (1, 'Bayesian Curl',             'Biceps',     1, datetime('now')),
  (1, 'Incline Curl',              'Biceps',     1, datetime('now')),
  (1, 'Preacher Curl',             'Biceps',     0, datetime('now')),
  (1, 'Tricep Pushdown',           'Triceps',    0, datetime('now')),
  (1, 'Overhead Tricep Extension', 'Triceps',    0, datetime('now')),
  (1, 'Tricep Extension',          'Triceps',    0, datetime('now')),
  (1, 'Squat',                     'Quads',      0, datetime('now')),
  (1, 'Romanian Deadlift',         'Hamstrings', 0, datetime('now'));

-- =====================
-- Workout Plans — one per training day
-- id  name
--  1  Push
--  2  Pull
--  3  Legs
-- =====================
INSERT INTO workout_plans (user_id, name, description, created_at) VALUES
  (1, 'Push', 'Chest, shoulders, and triceps.',  datetime('now')),
  (1, 'Pull', 'Back and biceps.',                datetime('now')),
  (1, 'Legs', 'Quads, hamstrings, and glutes.',  datetime('now'));

-- =====================
-- Plan Days — one day per plan
-- id  plan_id  name
--  1     1     Push
--  2     2     Pull
--  3     3     Legs
-- =====================
INSERT INTO plan_days (plan_id, name, day_of_week, order_in_plan) VALUES
  (1, 'Push', NULL, 1),
  (2, 'Pull', NULL, 1),
  (3, 'Legs', NULL, 1);

-- =====================
-- Plan Exercises
-- =====================

-- Push (plan_id=1, day_id=1)
INSERT INTO plan_exercises (plan_id, day_id, exercise_id, order_in_day, target_sets, target_reps) VALUES
  (1, 1,  1, 1, 4, 8),   -- Bench Press               4×8
  (1, 1,  2, 2, 3, 10),  -- Incline DB Press          3×10
  (1, 1,  4, 3, 3, 15),  -- Pec Fly                   3×15
  (1, 1,  5, 4, 3, 8),   -- Overhead Press            3×8
  (1, 1,  6, 5, 4, 15),  -- Lateral Raise             4×15
  (1, 1, 14, 6, 3, 12),  -- Tricep Pushdown           3×12
  (1, 1, 15, 7, 3, 10);  -- Overhead Tricep Extension 3×10

-- Pull (plan_id=2, day_id=2)
INSERT INTO plan_exercises (plan_id, day_id, exercise_id, order_in_day, target_sets, target_reps) VALUES
  (2, 2,  8, 1, 4, 8),   -- Pull Up        4×8
  (2, 2,  9, 2, 4, 8),   -- Barbell Row    4×8
  (2, 2, 10, 3, 3, 12),  -- Dumbbell Curl  3×12
  (2, 2, 11, 4, 3, 12),  -- Bayesian Curl  3×12
  (2, 2, 13, 5, 3, 10);  -- Preacher Curl  3×10

-- Legs (plan_id=3, day_id=3)
INSERT INTO plan_exercises (plan_id, day_id, exercise_id, order_in_day, target_sets, target_reps) VALUES
  (3, 3, 17, 1, 4, 6),   -- Squat              4×6
  (3, 3, 18, 2, 3, 10);  -- Romanian Deadlift  3×10

-- =====================
-- Sample Workouts
-- =====================
INSERT INTO workouts (user_id, workout_date, name, notes, plan_id, created_at) VALUES
  (1, '2025-01-06', 'Push Day', 'Felt strong on bench.', 1, datetime('now')),
  (1, '2025-01-07', 'Pull Day', 'Good lat engagement.',  2, datetime('now'));

-- =====================
-- Sample Sets
-- =====================

-- Push workout — Bench Press (exercise_id=1)
INSERT INTO sets (workout_id, exercise_id, set_number, side, reps, weight, is_warmup, created_at) VALUES
  (1, 1, 1, 'both', 10, 135, 0, datetime('now')),
  (1, 1, 2, 'both',  8, 155, 0, datetime('now')),
  (1, 1, 3, 'both',  6, 175, 0, datetime('now'));

-- Pull workout — Pull Up (exercise_id=8)
INSERT INTO sets (workout_id, exercise_id, set_number, side, reps, weight, is_warmup, created_at) VALUES
  (2, 8, 1, 'both', 10, 0, 0, datetime('now')),
  (2, 8, 2, 'both',  8, 0, 0, datetime('now')),
  (2, 8, 3, 'both',  7, 0, 0, datetime('now'));

-- Pull workout — Dumbbell Curl (exercise_id=10, unilateral)
INSERT INTO sets (workout_id, exercise_id, set_number, side, reps, weight, is_warmup, created_at) VALUES
  (2, 10, 1, 'left',  10, 35, 0, datetime('now')),
  (2, 10, 1, 'right',  9, 35, 0, datetime('now')),
  (2, 10, 2, 'left',   8, 40, 0, datetime('now')),
  (2, 10, 2, 'right',  8, 40, 0, datetime('now'));

