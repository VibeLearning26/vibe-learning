-- Run this file by itself when the admin wants to restart the current
-- role-wheel section from today for the next 7 days.

UPDATE public.wheel_config
SET
  assignment_duration_days = 7,
  allow_spin = true,
  last_spin_at = NOW(),
  updated_at = NOW()
WHERE id = 1;

INSERT INTO public.wheel_config (id, assignment_duration_days, allow_spin, last_spin_at, updated_at)
SELECT 1, 7, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.wheel_config WHERE id = 1
);
