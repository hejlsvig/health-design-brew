-- 016: Public RPC functions for token-based check-in access
-- These functions use SECURITY DEFINER to bypass RLS while validating the access_token internally.
-- This allows the public check-in form to work without authentication.

-- 1. Get coaching client data by access token
CREATE OR REPLACE FUNCTION get_coaching_by_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', cc.id,
    'profile_id', cc.profile_id,
    'status', cc.status,
    'start_date', cc.start_date,
    'check_in_frequency', cc.check_in_frequency,
    'coaching_package', cc.coaching_package,
    'profile', json_build_object(
      'full_name', p.name,
      'email', p.email,
      'language', p.language,
      'start_weight', p.weight,
      'goal_weight', p.weight_goal,
      'daily_calories', p.daily_calories
    )
  ) INTO result
  FROM coaching_clients cc
  JOIN profiles p ON p.id = cc.profile_id
  WHERE cc.access_token = p_token
    AND cc.status = 'active';

  IF result IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive token';
  END IF;

  RETURN result;
END;
$$;

-- 2. Get check-in history by access token
CREATE OR REPLACE FUNCTION get_checkins_by_token(p_token UUID, p_limit INTEGER DEFAULT 20)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_id UUID;
  result JSON;
BEGIN
  SELECT cc.id INTO client_id
  FROM coaching_clients cc
  WHERE cc.access_token = p_token
    AND cc.status = 'active';

  IF client_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive token';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(wc) ORDER BY wc.created_at DESC), '[]'::json)
  INTO result
  FROM (
    SELECT
      id, week_number, weight, mood, energy,
      hunger, cravings, sleep_hours, sleep_quality,
      digestion, activity, fasting_hours, fasting_feeling,
      stress_factors, weekly_win, deviations, notes,
      created_at
    FROM weekly_checkins
    WHERE coaching_client_id = client_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ) wc;

  RETURN result;
END;
$$;

-- 3. Submit a new check-in by access token
CREATE OR REPLACE FUNCTION submit_checkin_by_token(
  p_token UUID,
  p_weight REAL DEFAULT NULL,
  p_mood INTEGER DEFAULT NULL,
  p_energy INTEGER DEFAULT NULL,
  p_hunger TEXT DEFAULT NULL,
  p_cravings TEXT DEFAULT NULL,
  p_sleep_hours REAL DEFAULT NULL,
  p_sleep_quality INTEGER DEFAULT NULL,
  p_digestion TEXT DEFAULT NULL,
  p_activity TEXT DEFAULT NULL,
  p_fasting_hours INTEGER DEFAULT NULL,
  p_fasting_feeling TEXT DEFAULT NULL,
  p_stress_factors TEXT DEFAULT NULL,
  p_weekly_win TEXT DEFAULT NULL,
  p_deviations TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_id UUID;
  next_week INTEGER;
  new_id UUID;
BEGIN
  SELECT cc.id INTO client_id
  FROM coaching_clients cc
  WHERE cc.access_token = p_token
    AND cc.status = 'active';

  IF client_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive token';
  END IF;

  -- Calculate next week number
  SELECT COALESCE(MAX(week_number), 0) + 1 INTO next_week
  FROM weekly_checkins
  WHERE coaching_client_id = client_id;

  INSERT INTO weekly_checkins (
    id, coaching_client_id, week_number,
    weight, mood, energy, hunger, cravings,
    sleep_hours, sleep_quality, digestion, activity,
    fasting_hours, fasting_feeling,
    stress_factors, weekly_win, deviations, notes,
    created_at
  ) VALUES (
    gen_random_uuid(), client_id, next_week,
    p_weight, p_mood, p_energy, p_hunger, p_cravings,
    p_sleep_hours, p_sleep_quality, p_digestion, p_activity,
    p_fasting_hours, p_fasting_feeling,
    p_stress_factors, p_weekly_win, p_deviations, p_notes,
    NOW()
  )
  RETURNING id INTO new_id;

  -- Reset reminder status after successful check-in
  UPDATE coaching_clients
  SET reminder_status = 'none',
      checkin_reminders_enabled = true
  WHERE id = client_id;

  RETURN json_build_object('id', new_id, 'week_number', next_week);
END;
$$;

-- Grant execute to anon role (public access via token validation)
GRANT EXECUTE ON FUNCTION get_coaching_by_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_checkins_by_token(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION submit_checkin_by_token(UUID, REAL, INTEGER, INTEGER, TEXT, TEXT, REAL, INTEGER, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Also grant to authenticated for completeness
GRANT EXECUTE ON FUNCTION get_coaching_by_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_checkins_by_token(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_checkin_by_token(UUID, REAL, INTEGER, INTEGER, TEXT, TEXT, REAL, INTEGER, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
