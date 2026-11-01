-- ============================================================================
-- WT-LINKS — Complete Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Brand: SK MODS | Developer: Syed Kashif
-- Canonical Domain: https://wagrouplinks.vercel.app
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. categories
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9\-]+$'),
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'MessageSquare',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order ASC);

-- 2. directory_entries (Unified table for WhatsApp Groups & Channels)
CREATE TABLE IF NOT EXISTS public.directory_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('group', 'channel')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9\-]+$'),
  invite_url TEXT NOT NULL UNIQUE CHECK (
    invite_url ~ '^https://(chat\.whatsapp\.com|whatsapp\.com/channel|www\.whatsapp\.com/channel)/[A-Za-z0-9_\-]+/?$'
  ),
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'archived', 'removed')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  total_clicks INTEGER NOT NULL DEFAULT 0 CHECK (total_clicks >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_directory_entries_type_status ON public.directory_entries(type, status);
CREATE INDEX IF NOT EXISTS idx_directory_entries_category ON public.directory_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_directory_entries_featured ON public.directory_entries(is_featured) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_directory_entries_clicks ON public.directory_entries(total_clicks DESC);
CREATE INDEX IF NOT EXISTS idx_directory_entries_published_at ON public.directory_entries(published_at DESC);

-- 3. promotions (Enforces maximum 10 active promotions via trigger)
CREATE TABLE IF NOT EXISTS public.promotions (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES public.directory_entries(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  duration_days INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
  start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_at TIMESTAMPTZ NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(status, end_at, display_order ASC);

CREATE OR REPLACE FUNCTION public.enforce_max_active_promotions()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF NEW.status = 'active' AND NEW.end_at > NOW() THEN
    SELECT COUNT(*) INTO active_count
    FROM public.promotions
    WHERE status = 'active' AND end_at > NOW() AND id <> COALESCE(NEW.id, '');

    IF active_count >= 10 THEN
      RAISE EXCEPTION 'Maximum of 10 active promotions reached. Wait for a slot to expire or deactivate an existing promotion.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_active_promotions ON public.promotions;
CREATE TRIGGER trg_enforce_max_active_promotions
BEFORE INSERT OR UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.enforce_max_active_promotions();

-- 4. promotion_requests
CREATE TABLE IF NOT EXISTS public.promotion_requests (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES public.directory_entries(id) ON DELETE CASCADE,
  requested_duration INTEGER NOT NULL CHECK (requested_duration BETWEEN 1 AND 365),
  requested_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 5. click_events
CREATE TABLE IF NOT EXISTS public.click_events (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES public.directory_entries(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'join_click' CHECK (event_type IN ('join_click', 'page_view', 'promotion_click', 'share_click')),
  visitor_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_click_events_entry_created ON public.click_events(entry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_dedup ON public.click_events(entry_id, visitor_hash, event_type, created_at DESC);

-- 6. reports
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES public.directory_entries(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('Spam', 'Scam', 'Inappropriate content', 'Broken invite link', 'Wrong category', 'Misleading information', 'Other')),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status, created_at DESC);

-- 7. blog_categories & blog_tags & blog_posts
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9\-]+$'),
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  featured_image TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Community Guides',
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'scheduled')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_pub ON public.blog_posts(status, published_at DESC);

-- 8. website_settings
CREATE TABLE IF NOT EXISTS public.website_settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. metadata_cache
CREATE TABLE IF NOT EXISTS public.metadata_cache (
  normalized_url TEXT PRIMARY KEY,
  entry_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can read active categories" ON public.categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can read published entries" ON public.directory_entries
  FOR SELECT USING (status = 'published');

CREATE POLICY "Public can submit new published entries" ON public.directory_entries
  FOR INSERT WITH CHECK (status = 'published' AND is_featured = FALSE AND total_clicks = 0);

CREATE POLICY "Public can read active non-expired promotions" ON public.promotions
  FOR SELECT USING (status = 'active' AND end_at > NOW());

CREATE POLICY "Public can insert promotion requests" ON public.promotion_requests
  FOR INSERT WITH CHECK (status = 'pending' AND admin_notes = '');

CREATE POLICY "Public can record click events" ON public.click_events
  FOR INSERT WITH CHECK (event_type IN ('join_click', 'page_view', 'promotion_click', 'share_click'));

CREATE POLICY "Public can submit reports" ON public.reports
  FOR INSERT WITH CHECK (status = 'pending' AND admin_notes = '');

CREATE POLICY "Public can read published blog posts" ON public.blog_posts
  FOR SELECT USING (status = 'published' AND (published_at IS NULL OR published_at <= NOW()));

CREATE POLICY "Public can read blog categories" ON public.blog_categories
  FOR SELECT USING (TRUE);

CREATE POLICY "Public can read blog tags" ON public.blog_tags
  FOR SELECT USING (TRUE);
