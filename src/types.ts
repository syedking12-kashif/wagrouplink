export type EntryType = 'group' | 'channel';
export type EntryStatus = 'published' | 'archived' | 'removed';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  seo_title: string;
  seo_description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  group_count?: number;
  channel_count?: number;
}

export interface DirectoryEntry {
  id: string;
  type: EntryType;
  name: string;
  slug: string;
  invite_url: string;
  description: string;
  image_url: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  status: EntryStatus;
  is_featured: boolean;
  is_verified: boolean;
  total_clicks: number;
  created_at: string;
  updated_at: string;
  published_at: string;
  promotion_order?: number;
  promotion_end_at?: string;
}

export interface Promotion {
  id: string;
  entry_id: string;
  entry_name?: string;
  entry_type?: EntryType;
  entry_slug?: string;
  status: 'active' | 'expired' | 'cancelled';
  price: number;
  currency: string;
  duration_days: number;
  start_at: string;
  end_at: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PromotionRequest {
  id: string;
  entry_id: string;
  entry_name?: string;
  entry_type?: EntryType;
  entry_slug?: string;
  invite_url?: string;
  requested_duration: number;
  requested_price: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string;
  created_at: string;
  reviewed_at?: string;
}

export interface ClickEvent {
  id: string;
  entry_id: string;
  event_type: 'join_click' | 'page_view' | 'promotion_click' | 'share_click';
  visitor_hash: string;
  created_at: string;
}

export type ReportReason =
  | 'Spam'
  | 'Scam'
  | 'Inappropriate content'
  | 'Broken invite link'
  | 'Wrong category'
  | 'Misleading information'
  | 'Other';

export interface ReportItem {
  id: string;
  entry_id: string;
  entry_name?: string;
  entry_slug?: string;
  entry_type?: EntryType;
  reason: ReportReason;
  description: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  admin_notes: string;
  created_at: string;
  reviewed_at?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  seo_title: string;
  seo_description: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface AdSettings {
  enabled_globally: boolean;
  publisher_id: string;
  homepage_ad_enabled: boolean;
  homepage_ad_code: string;
  category_ad_enabled: boolean;
  category_ad_code: string;
  detail_ad_enabled: boolean;
  detail_ad_code: string;
  submit_ad_enabled: boolean;
  submit_ad_code: string;
  blog_ad_enabled: boolean;
  blog_ad_code: string;
}

export interface SiteSettings {
  site_name: string;
  tagline: string;
  brand_owner: string;
  developer_name: string;
  contact_email: string;
  whatsapp_number: string;
  instagram_handle: string;
  canonical_url: string;
  default_seo_title: string;
  default_seo_description: string;
  noindex_search_pages: boolean;
  require_rate_limiting: boolean;
  max_submissions_per_hour: number;
  ads: AdSettings;
}
