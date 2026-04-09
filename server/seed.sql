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

-- =====================
-- Users
-- =====================
INSERT INTO users (email, password_hash, username, created_at)
VALUES
  ('test@test.com', 'hashed_password', 'testuser', datetime('now'));

-- =====================
-- Exercises
-- =====================
INSERT INTO exercises (user_id, name, muscle_group, created_at)
VALUES
  (1, 'Bench Press',        'Chest',    datetime('now')),
  (1, 'Incline DB Press',   'Chest',    datetime('now')),
  (1, 'Overhead Press',     'Shoulders',datetime('now')),
  (1, 'Lateral Raise',      'Shoulders',datetime('now')),
  (1, 'Pull Up',            'Back',     datetime('now')),
  (1, 'Barbell Row',        'Back',     datetime('now')),
  (1, 'Dumbbell Curl',      'Biceps',   datetime('now')),
  (1, 'Squat',              'Quads',    datetime('now')),
  (1, 'Romanian Deadlift',  'Hamstrings',datetime('now'));

-- =====================
-- Workout Plans
-- =====================
INSERT INTO workout_plans (user_id, name, description, created_at)
VALUES
  (1, 'Push Pull Legs', '6-day PPL split. Push Mon/Thu, Pull Tue/Fri, Legs Wed/Sat.', datetime('now'));

-- =====================
-- Plan Days
-- day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
-- =====================
INSERT INTO plan_days (plan_id, name, day_of_week, order_in_plan)
VALUES
  (1, 'Push Day',  1, 1),  -- Monday
  (1, 'Pull Day',  2, 2),  -- Tuesday
  (1, 'Leg Day',   3, 3),  -- Wednesday
  (1, 'Push Day',  4, 4),  -- Thursday
  (1, 'Pull Day',  5, 5),  -- Friday
  (1, 'Leg Day',   6, 6);  -- Saturday

-- =====================
-- Plan Exercises
-- Linking exercises to plan days with targets
-- =====================

-- Push Day (day_id 1 and 4 — same exercises both push days)
INSERT INTO plan_exercises (plan_id, day_id, exercise_id, order_in_day, target_sets, target_reps)
VALUES
  -- Push Day Monday (day 1)
  (1, 1, 1, 1, 4, 8),   -- Bench Press       4x8
  (1, 1, 2, 2, 3, 10),  -- Incline DB Press  3x10
  (1, 1, 3, 3, 3, 8),   -- Overhead Press    3x8
  (1, 1, 4, 4, 4, 15),  -- Lateral Raise     4x15

  -- Push Day Thursday (day 4)
  (1, 4, 1, 1, 4, 8),
  (1, 4, 2, 2, 3, 10),
  (1, 4, 3, 3, 3, 8),
  (1, 4, 4, 4, 4, 15);

INSERT INTO plan_exercises (plan_id, day_id, exercise_id, order_in_day, target_sets, target_reps)
VALUES
  -- Pull Day Tuesday (day 2)
  (1, 2, 5, 1, 4, 8),   -- Pull Up     4x8
  (1, 2, 6, 2, 4, 8),   -- Barbell Row 4x8
  (1, 2, 7, 3, 3, 12),  -- DB Curl     3x12

  -- Pull Day Friday (day 5)
  (1, 5, 5, 1, 4, 8),
  (1, 5, 6, 2, 4, 8),
  (1, 5, 7, 3, 3, 12);

INSERT INTO plan_exercises (plan_id, day_id, exercise_id, order_in_day, target_sets, target_reps)
VALUES
  -- Leg Day Wednesday (day 3)
  (1, 3, 8, 1, 4, 6),   -- Squat              4x6
  (1, 3, 9, 2, 3, 10),  -- Romanian Deadlift  3x10

  -- Leg Day Saturday (day 6)
  (1, 6, 8, 1, 4, 6),
  (1, 6, 9, 2, 3, 10);

-- =====================
-- Workouts
-- =====================
INSERT INTO workouts (user_id, workout_date, name, notes, plan_id, created_at)
VALUES
  (1, '2025-01-01', 'Push Day', 'Chest focus', 1, datetime('now')),
  (1, '2025-01-08', 'Pull Day', 'Back focus',  1, datetime('now'));

-- =====================
-- Sets
-- =====================

-- Bench Press (bilateral) — workout 1
INSERT INTO sets (workout_id, exercise_id, set_number, side, reps, weight, is_warmup, created_at)
VALUES
  (1, 1, 1, 'both', 10, 135, 0, datetime('now')),
  (1, 1, 2, 'both', 8,  155, 0, datetime('now')),
  (2, 1, 1, 'both', 5,  185, 0, datetime('now')),
  (2, 1, 2, 'both', 3,  205, 0, datetime('now'));

-- Dumbbell Curl (unilateral) — workout 1
INSERT INTO sets (workout_id, exercise_id, set_number, side, reps, weight, is_warmup, created_at)
VALUES
  (1, 7, 1, 'left',  10, 35, 0, datetime('now')),
  (1, 7, 1, 'right',  9, 35, 0, datetime('now')),
  (1, 7, 2, 'left',   8, 40, 0, datetime('now')),
  (1, 7, 2, 'right',  8, 40, 0, datetime('now'));
