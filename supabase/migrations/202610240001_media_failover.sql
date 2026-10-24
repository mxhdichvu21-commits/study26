-- Study26 media failover: keep invite grants private and pin providers per room.
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS media_provider text;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_media_provider_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_media_provider_check
  CHECK (media_provider IS NULL OR media_provider IN ('livekit', 'piik'));

-- Preserve the provider for classes already live when this migration is applied.
UPDATE public.rooms SET media_provider = 'livekit'
  WHERE status = 'live' AND media_provider IS NULL;

CREATE TABLE IF NOT EXISTS public.media_piik_invites (
  room_id uuid PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  invite_url text NOT NULL,
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.media_piik_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.media_piik_invites FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.media_livekit_participant_sessions (
  room_sid text NOT NULL,
  participant_sid text NOT NULL,
  joined_at timestamptz,
  left_at timestamptz,
  PRIMARY KEY (room_sid, participant_sid)
);
ALTER TABLE public.media_livekit_participant_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.media_livekit_participant_sessions FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS media_livekit_sessions_month_idx
  ON public.media_livekit_participant_sessions (joined_at, left_at);

-- Verified LiveKit webhooks may arrive more than once or out of order.
CREATE OR REPLACE FUNCTION public.study26_record_livekit_event(
  p_room_sid text, p_participant_sid text, p_event text, p_at timestamptz
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF p_event NOT IN ('participant_joined','participant_left')
    OR length(p_room_sid) > 200 OR length(p_participant_sid) > 200
    OR p_room_sid = '' OR p_participant_sid = ''
    OR p_at IS NULL THEN
    RAISE EXCEPTION 'Invalid LiveKit participant event';
  END IF;
  INSERT INTO public.media_livekit_participant_sessions AS s
    (room_sid, participant_sid, joined_at, left_at)
  VALUES (
    p_room_sid, p_participant_sid,
    CASE WHEN p_event = 'participant_joined' THEN p_at ELSE NULL END,
    CASE WHEN p_event = 'participant_left' THEN p_at ELSE NULL END
  )
  ON CONFLICT (room_sid, participant_sid) DO UPDATE SET
    joined_at = CASE
      WHEN EXCLUDED.joined_at IS NULL THEN s.joined_at
      WHEN s.joined_at IS NULL THEN EXCLUDED.joined_at
      ELSE LEAST(s.joined_at, EXCLUDED.joined_at) END,
    left_at = CASE
      WHEN EXCLUDED.left_at IS NULL THEN s.left_at
      WHEN s.left_at IS NULL THEN EXCLUDED.left_at
      ELSE GREATEST(s.left_at, EXCLUDED.left_at) END;
END; $$;

-- Monthly WebRTC participant-minute estimate. Only accounts for delivered webhooks.
CREATE OR REPLACE FUNCTION public.study26_livekit_minutes_used()
RETURNS numeric LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH bounds AS (
    SELECT (date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS since,
           ((date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC') AS until_at
  )
  SELECT COALESCE(SUM(GREATEST(0,
    EXTRACT(epoch FROM
      LEAST(COALESCE(s.left_at, now()), b.until_at) - GREATEST(s.joined_at, b.since)
    )
  )), 0)::numeric / 60
  FROM public.media_livekit_participant_sessions s CROSS JOIN bounds b
  WHERE s.joined_at IS NOT NULL AND s.joined_at < b.until_at
    AND COALESCE(s.left_at, now()) > b.since;
$$;

REVOKE ALL ON FUNCTION public.study26_record_livekit_event(text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.study26_livekit_minutes_used() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.study26_record_livekit_event(text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.study26_livekit_minutes_used() TO service_role;

-- Global switch for NEW rooms only (existing rooms keep their pinned provider).
CREATE TABLE IF NOT EXISTS public.media_failover_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  mode text NOT NULL DEFAULT 'auto' CHECK (mode IN ('auto','livekit','piik')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.media_failover_control (singleton, mode)
  VALUES (true, 'auto') ON CONFLICT (singleton) DO NOTHING;
ALTER TABLE public.media_failover_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.media_failover_control FROM anon, authenticated;
