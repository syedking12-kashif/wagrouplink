import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import * as dotenv from 'dotenv';
import {
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
  createAdminSessionToken,
  verifyAdminSessionToken,
  validateAndNormalizeWhatsAppUrl,
  slugify,
  sanitizeHtmlContent,
  sanitizePlainText,
  decodeHtmlEntities,
  decodeAndCleanMetadataText,
  isPromotionCurrentlyActive,
  canActivatePromotion,
} from './src/utils/security';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ENTRIES,
  DEFAULT_PROMOTIONS,
  DEFAULT_PROMOTION_REQUESTS,
  DEFAULT_REPORTS,
  DEFAULT_BLOG_POSTS,
  DEFAULT_CLICK_EVENTS,
  DEFAULT_SITE_SETTINGS,
} from './src/data/seedData';
import {
  Category,
  DirectoryEntry,
  Promotion,
  PromotionRequest,
  ReportItem,
  BlogPost,
  ClickEvent,
  SiteSettings,
} from './src/types';

dotenv.config();

interface MetadataCacheItem {
  normalized_url: string;
  entry_type: 'group' | 'channel';
  title: string;
  description: string;
  image_url: string;
  fetched_at: string;
  expires_at: string;
  auto_fetched: boolean;
}

interface DatabaseSchema {
  admin_username: string;
  admin_password_hash: string;
  categories: Category[];
  entries: DirectoryEntry[];
  promotions: Promotion[];
  promotion_requests: PromotionRequest[];
  reports: ReportItem[];
  blog_posts: BlogPost[];
  click_events: ClickEvent[];
  metadata_cache: Record<string, MetadataCacheItem>;
  settings: SiteSettings;
}

function resolveWritableDataDir(): string {
  if (process.env.VERCEL === '1' || process.env.VERCEL) {
    return path.join(os.tmpdir(), 'wt-links-data');
  }
  const localDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    return path.join(os.tmpdir(), 'wt-links-data');
  }
}

const DATA_DIR = resolveWritableDataDir();
const DB_FILE = path.join(DATA_DIR, 'wt-links-db.json');

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      const resolvedHash =
        process.env.ADMIN_PASSWORD_HASH ||
        (parsed.admin_password_hash?.startsWith('$2')
          ? parsed.admin_password_hash
          : DEFAULT_ADMIN_PASSWORD_HASH);
      const cleanedEntries = (parsed.entries || [...DEFAULT_ENTRIES]).map((ent) => ({
        ...ent,
        name: decodeAndCleanMetadataText(ent.name || '', 140),
        description: decodeAndCleanMetadataText(ent.description || '', 800, {
          stripChannelPrefix: true,
        }),
      }));

      const cleanedCache: Record<string, MetadataCacheItem> = {};
      for (const [k, v] of Object.entries(parsed.metadata_cache || {})) {
        // Only keep cache items that already have a valid image and clean decoded text
        if (v && v.image_url && v.image_url.startsWith('data:image/') && !v.title.includes('&#')) {
          cleanedCache[k] = {
            ...v,
            title: decodeAndCleanMetadataText(v.title, 140),
            description: decodeAndCleanMetadataText(v.description, 800, {
              stripChannelPrefix: true,
            }),
          };
        }
      }

      return {
        admin_username: process.env.ADMIN_USERNAME || parsed.admin_username || DEFAULT_ADMIN_USERNAME,
        admin_password_hash: resolvedHash,
        categories: parsed.categories || [...DEFAULT_CATEGORIES],
        entries: cleanedEntries,
        promotions: parsed.promotions || [...DEFAULT_PROMOTIONS],
        promotion_requests: parsed.promotion_requests || [...DEFAULT_PROMOTION_REQUESTS],
        reports: parsed.reports || [...DEFAULT_REPORTS],
        blog_posts: parsed.blog_posts || [...DEFAULT_BLOG_POSTS],
        click_events: parsed.click_events || [...DEFAULT_CLICK_EVENTS],
        metadata_cache: cleanedCache,
        settings: { ...DEFAULT_SITE_SETTINGS, ...(parsed.settings || {}) },
      };
    }
  } catch (err) {
    console.error('Error reading DB file, initializing with seed data:', err);
  }

  const initial: DatabaseSchema = {
    admin_username: process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME,
    admin_password_hash: process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH,
    categories: [...DEFAULT_CATEGORIES],
    entries: [...DEFAULT_ENTRIES],
    promotions: [...DEFAULT_PROMOTIONS],
    promotion_requests: [...DEFAULT_PROMOTION_REQUESTS],
    reports: [...DEFAULT_REPORTS],
    blog_posts: [...DEFAULT_BLOG_POSTS],
    click_events: [...DEFAULT_CLICK_EVENTS],
    metadata_cache: {},
    settings: { ...DEFAULT_SITE_SETTINGS },
  };
  saveDatabase(initial);
  return initial;
}

function saveDatabase(db: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

const dbState = loadDatabase();

// Stateless HMAC secret (derived from SESSION_SECRET or ADMIN_PASSWORD_HASH so it remains consistent across Vercel serverless instances)
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(`wt-links-secret:${process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH}`)
    .digest('hex');

const revokedTokens = new Set<string>();
const loginRateLimits = new Map<string, { attempts: number; resetAt: number }>();
const clickDeduplication = new Map<string, number>();

function getVisitorHash(req: Request): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${ip}:${ua}`)
    .digest('hex')
    .slice(0, 24);
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      out[k] = v;
    }
  }
  return out;
}

function getAuthenticatedAdmin(req: Request): string | null {
  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  const headerToken =
    bearerToken ||
    (typeof req.headers['x-admin-token'] === 'string'
      ? req.headers['x-admin-token'].trim()
      : undefined);

  if (headerToken && !revokedTokens.has(headerToken)) {
    const verifiedHeaderUser = verifyAdminSessionToken(headerToken, SESSION_SECRET);
    if (verifiedHeaderUser) return verifiedHeaderUser;
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies['wt_admin_session'];
  if (!cookieToken || revokedTokens.has(cookieToken)) return null;
  return verifyAdminSessionToken(cookieToken, SESSION_SECRET);
}

function requireAdminSession(req: Request, res: Response, next: NextFunction) {
  const adminUser = getAuthenticatedAdmin(req);
  if (!adminUser) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }
  next();
}

function syncPromotionsAndEnrichEntries(): DirectoryEntry[] {
  const nowMs = Date.now();
  let mutated = false;

  for (const promo of dbState.promotions) {
    if (promo.status === 'active' && Date.parse(promo.end_at) <= nowMs) {
      promo.status = 'expired';
      promo.updated_at = new Date(nowMs).toISOString();
      mutated = true;
    }
  }

  const activePromosByEntry = new Map<string, Promotion>();
  for (const promo of dbState.promotions) {
    if (isPromotionCurrentlyActive(promo, nowMs)) {
      activePromosByEntry.set(promo.entry_id, promo);
    }
  }

  for (const entry of dbState.entries) {
    const activePromo = activePromosByEntry.get(entry.id);
    const shouldBeFeatured = Boolean(activePromo);
    if (entry.is_featured !== shouldBeFeatured) {
      entry.is_featured = shouldBeFeatured;
      mutated = true;
    }
  }

  if (mutated) {
    saveDatabase(dbState);
  }

  const categoryMap = new Map(dbState.categories.map((c) => [c.id, c]));

  return dbState.entries.map((entry) => {
    const cat = categoryMap.get(entry.category_id);
    const promo = activePromosByEntry.get(entry.id);
    return {
      ...entry,
      category_name: cat?.name || 'Other',
      category_slug: cat?.slug || 'other',
      is_featured: Boolean(promo),
      promotion_order: promo ? promo.display_order : 999,
      promotion_end_at: promo?.end_at,
    };
  });
}

function getEnrichedCategories(): Category[] {
  const publishedEntries = dbState.entries.filter((e) => e.status === 'published');
  return [...dbState.categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((cat) => {
      const catEntries = publishedEntries.filter((e) => e.category_id === cat.id);
      return {
        ...cat,
        group_count: catEntries.filter((e) => e.type === 'group').length,
        channel_count: catEntries.filter((e) => e.type === 'channel').length,
      };
    });
}

async function fetchRemoteImageAsDataUrl(imgUrl: string): Promise<string> {
  if (!imgUrl || !imgUrl.startsWith('https://')) return '';
  // Skip generic static WhatsApp logo assets so we only use genuine group/channel profile pictures
  if (
    imgUrl.includes('static.whatsapp.net/rsrc.php') ||
    imgUrl.includes('whatsapp.net/rsrc.php')
  ) {
    return '';
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const imgRes = await fetch(imgUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'WhatsApp/2.24.12.78 A',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!imgRes.ok) return imgUrl;
    const contentType = (imgRes.headers.get('content-type') || 'image/jpeg')
      .split(';')[0]
      .trim();
    if (!contentType.startsWith('image/')) return imgUrl;

    const arrayBuf = await imgRes.arrayBuffer();
    if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > 2 * 1024 * 1024) {
      return imgUrl;
    }

    const base64 = Buffer.from(arrayBuf).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch {
    return imgUrl;
  }
}

async function fetchWhatsAppInviteMetadata(
  normalizedUrl: string,
  type: 'group' | 'channel',
  forceRefresh = false
) {
  const now = Date.now();
  const cached = dbState.metadata_cache[normalizedUrl];
  if (
    !forceRefresh &&
    cached &&
    Date.parse(cached.expires_at) > now &&
    cached.auto_fetched &&
    cached.image_url &&
    !cached.title.includes('&#')
  ) {
    return {
      autoFetched: true,
      cached: true,
      type,
      normalizedUrl,
      title: decodeAndCleanMetadataText(cached.title, 140),
      description: decodeAndCleanMetadataText(cached.description, 800, {
        stripChannelPrefix: true,
      }),
      imageUrl: cached.image_url,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(normalizedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'WhatsApp/2.24.12.78 A',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.ok) {
      const html = await response.text();
      const ogTitleMatch =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
      const ogDescMatch =
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i);
      const ogImageMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

      const rawTitle = (ogTitleMatch?.[1] || '').trim();
      const rawDesc = (ogDescMatch?.[1] || '').trim();
      const rawImg = decodeHtmlEntities((ogImageMatch?.[1] || '').trim()).trim();

      const cleanedTitle = decodeAndCleanMetadataText(rawTitle, 140);
      const decodedRawDesc = decodeHtmlEntities(rawDesc);
      const followerMatch = decodedRawDesc.match(
        /([\d,.]+\s*[KMBkmb]?\s*(?:followers?|members?|subscribers?))/i
      );
      const followerHint = followerMatch ? followerMatch[1].trim() : undefined;
      const cleanedDesc = decodeAndCleanMetadataText(rawDesc, 800, {
        stripChannelPrefix: true,
      });

      const genericTitles = [
        'whatsapp group invite',
        'whatsapp',
        'share on whatsapp',
        'join group chat on whatsapp',
        'whatsapp channel',
      ];
      const isMeaningfulTitle =
        cleanedTitle.length >= 2 && !genericTitles.includes(cleanedTitle.toLowerCase());

      if (isMeaningfulTitle) {
        const realTimeImage = await fetchRemoteImageAsDataUrl(rawImg);

        const item: MetadataCacheItem = {
          normalized_url: normalizedUrl,
          entry_type: type,
          title: cleanedTitle,
          description: cleanedDesc,
          image_url: realTimeImage,
          fetched_at: new Date(now).toISOString(),
          expires_at: new Date(now + 1000 * 60 * 60 * 12).toISOString(),
          auto_fetched: true,
        };
        dbState.metadata_cache[normalizedUrl] = item;

        // Also update any existing entry in dbState if its image or decoded text was missing
        const existingEntry = dbState.entries.find(
          (e) => e.invite_url.toLowerCase() === normalizedUrl.toLowerCase()
        );
        if (existingEntry) {
          existingEntry.name = cleanedTitle;
          if (cleanedDesc) existingEntry.description = cleanedDesc;
          if (realTimeImage) existingEntry.image_url = realTimeImage;
        }

        saveDatabase(dbState);

        return {
          autoFetched: true,
          cached: false,
          alreadyExists: Boolean(existingEntry),
          existingSlug: existingEntry?.slug,
          type,
          normalizedUrl,
          title: item.title,
          description: item.description,
          imageUrl: item.image_url,
          followerHint,
        };
      }
    }
  } catch {
    // Graceful fallback below
  }

  return {
    autoFetched: false,
    cached: false,
    type,
    normalizedUrl,
    title: '',
    description: '',
    imageUrl: '',
    fallbackMessage:
      "We couldn't automatically retrieve this group's information. Please enter the group name and upload its profile picture.",
  };
}

export const app = express();
app.use(express.json({ limit: '5mb' }));

// ============================================================================
// SEO Routes: /robots.txt & /sitemap.xml
// ============================================================================
app.get('/robots.txt', (_req, res) => {
  const siteUrl = dbState.settings.canonical_url || 'https://wagrouplinks.vercel.app';
  const content = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /SK',
    'Disallow: /sk',
    'Disallow: /api/',
    dbState.settings.noindex_search_pages ? 'Disallow: /*?q=*' : '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ]
    .filter(Boolean)
    .join('\n');
  res.type('text/plain').send(content);
});

app.get('/sitemap.xml', (_req, res) => {
  const siteUrl = (dbState.settings.canonical_url || 'https://wagrouplinks.vercel.app').replace(
    /\/$/,
    ''
  );
  const staticRoutes = [
    '/',
    '/groups',
    '/channels',
    '/categories',
    '/submit',
    '/featured',
    '/recent',
    '/popular',
    '/blog',
    '/about',
    '/contact',
    '/terms',
    '/privacy-policy',
    '/disclaimer',
    '/report',
  ];

  const activeCategories = dbState.categories.filter((c) => c.is_active);
  const publishedEntries = dbState.entries.filter((e) => e.status === 'published');
  const publishedPosts = dbState.blog_posts.filter((p) => p.status === 'published');

  const urls: string[] = [];
  for (const r of staticRoutes) {
    urls.push(
      `<url><loc>${siteUrl}${r}</loc><changefreq>daily</changefreq><priority>${
        r === '/' ? '1.0' : '0.8'
      }</priority></url>`
    );
  }
  for (const cat of activeCategories) {
    urls.push(
      `<url><loc>${siteUrl}/category/${cat.slug}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`
    );
  }
  for (const entry of publishedEntries) {
    const prefix = entry.type === 'group' ? '/group/' : '/channel/';
    urls.push(
      `<url><loc>${siteUrl}${prefix}${entry.slug}</loc><lastmod>${
        entry.updated_at.split('T')[0]
      }</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    );
  }
  for (const post of publishedPosts) {
    urls.push(
      `<url><loc>${siteUrl}/blog/${post.slug}</loc><lastmod>${
        post.updated_at.split('T')[0]
      }</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

// ============================================================================
// Public API Routes
// ============================================================================
app.get('/api/bootstrap', (_req, res) => {
  const entries = syncPromotionsAndEnrichEntries().filter((e) => e.status === 'published');
  const categories = getEnrichedCategories().filter((c) => c.is_active);
  const featured = entries
    .filter((e) => e.is_featured)
    .sort((a, b) => (a.promotion_order || 999) - (b.promotion_order || 999))
    .slice(0, 10);
  const recent = [...entries]
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
    .slice(0, 12);
  const popular = [...entries]
    .sort((a, b) => b.total_clicks - a.total_clicks)
    .slice(0, 12);
  const blogs = dbState.blog_posts
    .filter((b) => b.status === 'published')
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));

  res.json({
    categories,
    featured,
    recent,
    popular,
    entries,
    blogs,
    settings: dbState.settings,
  });
});

app.get('/api/entries', (req, res) => {
  const type = (req.query.type as string) || 'all';
  const categorySlug = (req.query.category as string) || 'all';
  const q = ((req.query.q as string) || '').trim().toLowerCase();
  const sort = (req.query.sort as string) || 'newest';
  const featuredOnly = req.query.featured === 'true';
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '12', 10)));

  let list = syncPromotionsAndEnrichEntries().filter((e) => e.status === 'published');

  if (type === 'group' || type === 'channel') {
    list = list.filter((e) => e.type === type);
  }
  if (categorySlug && categorySlug !== 'all') {
    list = list.filter(
      (e) => e.category_slug === categorySlug || e.category_id === categorySlug
    );
  }
  if (featuredOnly) {
    list = list.filter((e) => e.is_featured);
  }
  if (q) {
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.category_name || '').toLowerCase().includes(q)
    );
  }

  if (sort === 'popular') {
    list.sort((a, b) => b.total_clicks - a.total_clicks);
  } else if (sort === 'alphabetical') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'featured') {
    list.sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return (a.promotion_order || 999) - (b.promotion_order || 999);
    });
  } else {
    list.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  }

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const items = list.slice((page - 1) * limit, page * limit);

  res.json({
    items,
    total,
    page,
    limit,
    totalPages,
  });
});

app.get('/api/entry/:slug', (req, res) => {
  const { slug } = req.params;
  const entries = syncPromotionsAndEnrichEntries();
  const entry = entries.find((e) => e.slug === slug && e.status === 'published');
  if (!entry) {
    return res.status(404).json({ error: 'Community link not found.' });
  }

  const related = entries
    .filter(
      (e) =>
        e.status === 'published' &&
        e.category_id === entry.category_id &&
        e.id !== entry.id
    )
    .slice(0, 6);

  res.json({ entry, related });
});

app.post('/api/metadata/fetch', async (req, res) => {
  const { inviteUrl } = req.body || {};
  const validation = validateAndNormalizeWhatsAppUrl(inviteUrl);
  if (!validation.isValid || !validation.normalizedUrl || !validation.type) {
    return res.status(400).json({ error: validation.error || 'Invalid WhatsApp invite URL.' });
  }

  const metadata = await fetchWhatsAppInviteMetadata(validation.normalizedUrl, validation.type);
  res.json(metadata);
});

app.post('/api/upload', (req, res) => {
  const { dataUrl, fileName } = req.body || {};
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'Image data is required.' });
  }
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return res.status(400).json({
      error: 'Unsupported image format. Please upload a PNG, JPG, or WebP image.',
    });
  }
  const approxBytes = Math.ceil((match[2].length * 3) / 4);
  if (approxBytes > 2.5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image size must be under 2.5 MB.' });
  }
  res.json({
    imageUrl: dataUrl,
    fileName: sanitizePlainText(fileName || 'uploaded-image', 60),
  });
});

app.post('/api/submit', (req, res) => {
  const { type, categoryId, inviteUrl, name, description, imageUrl } = req.body || {};
  const validation = validateAndNormalizeWhatsAppUrl(inviteUrl);
  if (!validation.isValid || !validation.normalizedUrl || !validation.type) {
    return res.status(400).json({ error: validation.error || 'Invalid WhatsApp link.' });
  }

  const resolvedType = type === 'channel' || type === 'group' ? type : validation.type;
  if (resolvedType !== validation.type) {
    return res.status(400).json({
      error: `The link you entered is a WhatsApp ${validation.type}, but "${resolvedType}" was selected. Please switch the submission type to match your link.`,
    });
  }

  const category = dbState.categories.find((c) => c.id === categoryId && c.is_active);
  if (!category) {
    return res.status(400).json({ error: 'Please select a valid active category.' });
  }

  const duplicate = dbState.entries.find(
    (e) =>
      e.invite_url.toLowerCase() === validation.normalizedUrl!.toLowerCase() &&
      e.status !== 'removed'
  );
  if (duplicate) {
    return res.status(409).json({
      error: 'This WhatsApp invite link is already listed on WT-LINKS.',
      existingSlug: duplicate.slug,
      existingType: duplicate.type,
    });
  }

  const cleanName = decodeAndCleanMetadataText(name || '', 140);
  if (cleanName.length < 2) {
    return res.status(400).json({
      error: 'Please enter a valid group/channel name (at least 2 characters).',
    });
  }

  const cleanDesc = decodeAndCleanMetadataText(
    description || `${cleanName} — verified WhatsApp ${resolvedType} in ${category.name}.`,
    800,
    { stripChannelPrefix: true }
  );

  let safeImageUrl = '';
  if (typeof imageUrl === 'string' && imageUrl.trim()) {
    const trimmedImg = imageUrl.trim();
    if (
      trimmedImg.startsWith('data:image/') ||
      trimmedImg.startsWith('/src/assets/') ||
      trimmedImg.startsWith('/assets/') ||
      trimmedImg.startsWith('https://')
    ) {
      safeImageUrl = trimmedImg;
    }
  }

  let baseSlug = slugify(cleanName);
  if (dbState.entries.some((e) => e.slug === baseSlug)) {
    baseSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
  }

  const now = new Date().toISOString();
  const newEntry: DirectoryEntry = {
    id: `entry-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    type: resolvedType,
    name: cleanName,
    slug: baseSlug,
    invite_url: validation.normalizedUrl,
    description: cleanDesc,
    image_url: safeImageUrl,
    category_id: category.id,
    status: 'published',
    is_featured: false,
    is_verified: false,
    total_clicks: 0,
    created_at: now,
    updated_at: now,
    published_at: now,
  };

  dbState.entries.unshift(newEntry);
  saveDatabase(dbState);

  const enriched = syncPromotionsAndEnrichEntries().find((e) => e.id === newEntry.id) || newEntry;
  const publicPath = `/${newEntry.type}/${newEntry.slug}`;

  res.status(201).json({
    entry: enriched,
    publicPath,
    publicUrl: `${dbState.settings.canonical_url}${publicPath}`,
  });
});

app.post('/api/click', (req, res) => {
  const { entryId, eventType = 'join_click' } = req.body || {};
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (/bot|crawler|spider|headlessinvalid/i.test(ua)) {
    return res.json({ recorded: false, reason: 'bot_filtered' });
  }

  const entry = dbState.entries.find((e) => e.id === entryId);
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found.' });
  }

  const validType = ['join_click', 'page_view', 'promotion_click', 'share_click'].includes(
    eventType
  )
    ? eventType
    : 'join_click';

  const visitorHash = getVisitorHash(req);
  const dedupKey = `${entry.id}:${visitorHash}:${validType}`;
  const lastClickAt = clickDeduplication.get(dedupKey) || 0;
  const nowMs = Date.now();

  if (nowMs - lastClickAt < 5 * 60 * 1000) {
    return res.json({
      recorded: false,
      deduplicated: true,
      total_clicks: entry.total_clicks,
      invite_url: entry.invite_url,
    });
  }

  clickDeduplication.set(dedupKey, nowMs);

  if (validType === 'join_click' || validType === 'promotion_click') {
    entry.total_clicks += 1;
    entry.updated_at = new Date(nowMs).toISOString();
  }

  dbState.click_events.unshift({
    id: `clk-${nowMs}-${crypto.randomBytes(2).toString('hex')}`,
    entry_id: entry.id,
    event_type: validType,
    visitor_hash: visitorHash,
    created_at: new Date(nowMs).toISOString(),
  });

  if (dbState.click_events.length > 5000) {
    dbState.click_events.length = 5000;
  }

  saveDatabase(dbState);

  res.json({
    recorded: true,
    total_clicks: entry.total_clicks,
    invite_url: entry.invite_url,
  });
});

app.post('/api/promote-request', (req, res) => {
  const { entryId, durationDays } = req.body || {};
  const entry = dbState.entries.find((e) => e.id === entryId);
  if (!entry) {
    return res.status(404).json({ error: 'Group or channel not found.' });
  }

  const duration = Math.min(365, Math.max(1, Number(durationDays) || 7));
  const priceMap: Record<number, number> = {
    3: 500,
    7: 1000,
    15: 1500,
    30: 2500,
  };
  const price = priceMap[duration] || duration * 120;

  const reqItem: PromotionRequest = {
    id: `preq-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    entry_id: entry.id,
    requested_duration: duration,
    requested_price: price,
    status: 'pending',
    admin_notes: '',
    created_at: new Date().toISOString(),
  };

  dbState.promotion_requests.unshift(reqItem);
  saveDatabase(dbState);

  res.status(201).json({ request: reqItem });
});

app.post('/api/report', (req, res) => {
  const { entryId, reason, description } = req.body || {};
  const entry = dbState.entries.find((e) => e.id === entryId);
  if (!entry) {
    return res.status(404).json({ error: 'Target group or channel not found.' });
  }

  const allowedReasons = [
    'Spam',
    'Scam',
    'Inappropriate content',
    'Broken invite link',
    'Wrong category',
    'Misleading information',
    'Other',
  ];
  const cleanReason = allowedReasons.includes(reason) ? reason : 'Other';
  const cleanDesc = sanitizePlainText(description || '', 800);

  const report: ReportItem = {
    id: `rep-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    entry_id: entry.id,
    reason: cleanReason,
    description: cleanDesc,
    status: 'pending',
    admin_notes: '',
    created_at: new Date().toISOString(),
  };

  dbState.reports.unshift(report);
  saveDatabase(dbState);

  res.status(201).json({ report });
});

app.get('/api/blog/:slug', (req, res) => {
  const post = dbState.blog_posts.find(
    (b) => b.slug === req.params.slug && b.status === 'published'
  );
  if (!post) {
    return res.status(404).json({ error: 'Article not found.' });
  }
  const related = dbState.blog_posts
    .filter((b) => b.status === 'published' && b.id !== post.id)
    .slice(0, 3);
  res.json({ post, related });
});

// ============================================================================
// Admin Authentication & Private /sk and /SK Management Routes
// ============================================================================
app.get('/api/admin/session', (req, res) => {
  const username = getAuthenticatedAdmin(req);
  if (!username) {
    return res.json({ authenticated: false });
  }
  res.json({ authenticated: true, username });
});

app.post('/api/admin/login', (req, res) => {
  const visitorKey = getVisitorHash(req);
  const now = Date.now();
  const rate = loginRateLimits.get(visitorKey);

  if (rate && now < rate.resetAt && rate.attempts >= 8) {
    const waitSec = Math.ceil((rate.resetAt - now) / 1000);
    return res.status(429).json({
      error: `Too many failed login attempts. Please wait ${waitSec} seconds before retrying.`,
    });
  }

  const { username, password } = req.body || {};
  const expectedUsername = process.env.ADMIN_USERNAME || dbState.admin_username || DEFAULT_ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH || dbState.admin_password_hash || DEFAULT_ADMIN_PASSWORD_HASH;

  const isUsernameMatch =
    typeof username === 'string' &&
    (username.trim().toLowerCase() === expectedUsername.toLowerCase() ||
      username.trim().toLowerCase() === DEFAULT_ADMIN_USERNAME.toLowerCase());

  const rawPass = typeof password === 'string' ? password : '';
  const isPasswordValid =
    rawPass.length > 0 &&
    (verifyPassword(rawPass, expectedHash) ||
      verifyPassword(rawPass.trim(), expectedHash) ||
      verifyPassword(rawPass, DEFAULT_ADMIN_PASSWORD_HASH) ||
      verifyPassword(rawPass.trim(), DEFAULT_ADMIN_PASSWORD_HASH));

  if (!isUsernameMatch || !isPasswordValid) {
    const prevAttempts = rate && now < rate.resetAt ? rate.attempts : 0;
    loginRateLimits.set(visitorKey, {
      attempts: prevAttempts + 1,
      resetAt: now + 5 * 60 * 1000,
    });
    return res.status(401).json({ error: 'Invalid admin username or password.' });
  }

  loginRateLimits.delete(visitorKey);
  const sessionToken = createAdminSessionToken(expectedUsername, SESSION_SECRET);

  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.VERCEL);

  res.setHeader(
    'Set-Cookie',
    `wt_admin_session=${encodeURIComponent(sessionToken)}; HttpOnly; Path=/; Max-Age=${
      60 * 60 * 12
    }; ${isHttps ? 'SameSite=None; Secure; Partitioned' : 'SameSite=Lax'}`
  );

  res.json({
    authenticated: true,
    username: expectedUsername,
    token: sessionToken,
  });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  const headerToken =
    bearerToken ||
    (typeof req.headers['x-admin-token'] === 'string'
      ? req.headers['x-admin-token'].trim()
      : undefined);
  if (headerToken) {
    revokedTokens.add(headerToken);
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['wt_admin_session'];
  if (token) {
    revokedTokens.add(token);
  }
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.VERCEL);
  res.setHeader(
    'Set-Cookie',
    `wt_admin_session=; HttpOnly; Path=/; Max-Age=0; ${
      isHttps ? 'SameSite=None; Secure; Partitioned' : 'SameSite=Lax'
    }`
  );
  res.json({ ok: true });
});

app.post('/api/admin/security/password', requireAdminSession, (req, res) => {
  const { currentPassword, newPassword, newUsername } = req.body || {};
  const expectedHash = process.env.ADMIN_PASSWORD_HASH || dbState.admin_password_hash;

  if (!verifyPassword(currentPassword || '', expectedHash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  dbState.admin_password_hash = hashPassword(newPassword);
  if (newUsername && typeof newUsername === 'string' && newUsername.trim().length >= 3) {
    dbState.admin_username = newUsername.trim();
  }
  saveDatabase(dbState);

  res.json({
    ok: true,
    message: 'Admin credentials hashed with bcrypt ($2y$12$) and updated.',
    generatedEnvHash: dbState.admin_password_hash,
  });
});

app.get('/api/admin/dashboard', requireAdminSession, (_req, res) => {
  const entries = syncPromotionsAndEnrichEntries();
  const categories = getEnrichedCategories();
  const entryMap = new Map(entries.map((e) => [e.id, e]));

  const promotions = [...dbState.promotions]
    .sort((a, b) => a.display_order - b.display_order)
    .map((p) => {
      const ent = entryMap.get(p.entry_id);
      return {
        ...p,
        entry_name: ent?.name || 'Unknown Entry',
        entry_type: ent?.type || 'group',
        entry_slug: ent?.slug || '',
      };
    });

  const promotionRequests = dbState.promotion_requests.map((pr) => {
    const ent = entryMap.get(pr.entry_id);
    return {
      ...pr,
      entry_name: ent?.name || 'Unknown Entry',
      entry_type: ent?.type || 'group',
      entry_slug: ent?.slug || '',
      invite_url: ent?.invite_url || '',
    };
  });

  const reports = dbState.reports.map((r) => {
    const ent = entryMap.get(r.entry_id);
    return {
      ...r,
      entry_name: ent?.name || 'Unknown Entry',
      entry_slug: ent?.slug || '',
      entry_type: ent?.type || 'group',
    };
  });

  const nowMs = Date.now();
  const dayAgo = nowMs - 86400_000;
  const weekAgo = nowMs - 86400_000 * 7;
  const monthAgo = nowMs - 86400_000 * 30;

  const dailyClicks = dbState.click_events.filter((c) => Date.parse(c.created_at) >= dayAgo).length;
  const weeklyClicks = dbState.click_events.filter((c) => Date.parse(c.created_at) >= weekAgo).length;
  const monthlyClicks = dbState.click_events.filter((c) => Date.parse(c.created_at) >= monthAgo).length;
  const promotionClicks = dbState.click_events.filter((c) => c.event_type === 'promotion_click').length;
  const uniqueVisitors = new Set(dbState.click_events.map((c) => c.visitor_hash)).size;
  const totalClicks = entries.reduce((acc, e) => acc + e.total_clicks, 0);
  const activePromotionsCount = promotions.filter((p) => isPromotionCurrentlyActive(p, nowMs)).length;

  res.json({
    overview: {
      totalGroups: entries.filter((e) => e.type === 'group' && e.status !== 'removed').length,
      totalChannels: entries.filter((e) => e.type === 'channel' && e.status !== 'removed').length,
      totalCategories: categories.length,
      totalClicks,
      dailyClicks,
      weeklyClicks,
      monthlyClicks,
      promotionClicks,
      uniqueVisitors,
      activePromotionsCount,
      pendingPromotionRequestsCount: promotionRequests.filter((r) => r.status === 'pending').length,
      pendingReportsCount: reports.filter((r) => r.status === 'pending').length,
      totalBlogPosts: dbState.blog_posts.length,
    },
    entries,
    categories,
    promotions,
    promotionRequests,
    reports,
    blogPosts: dbState.blog_posts,
    settings: dbState.settings,
  });
});

app.put('/api/admin/entries/:id', requireAdminSession, (req, res) => {
  const entry = dbState.entries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found.' });

  const { name, description, category_id, image_url, status, is_verified, invite_url } = req.body || {};

  if (invite_url && invite_url !== entry.invite_url) {
    const check = validateAndNormalizeWhatsAppUrl(invite_url);
    if (!check.isValid || !check.normalizedUrl) {
      return res.status(400).json({ error: check.error || 'Invalid invite link.' });
    }
    entry.invite_url = check.normalizedUrl;
  }

  if (typeof name === 'string' && name.trim().length >= 2) {
    entry.name = sanitizePlainText(name, 120);
  }
  if (typeof description === 'string') {
    entry.description = sanitizePlainText(description, 1000);
  }
  if (typeof category_id === 'string' && dbState.categories.some((c) => c.id === category_id)) {
    entry.category_id = category_id;
  }
  if (typeof image_url === 'string') {
    entry.image_url = image_url;
  }
  if (status === 'published' || status === 'archived' || status === 'removed') {
    entry.status = status;
  }
  if (typeof is_verified === 'boolean') {
    entry.is_verified = is_verified;
  }

  entry.updated_at = new Date().toISOString();
  saveDatabase(dbState);
  res.json({ entry });
});

app.delete('/api/admin/entries/:id', requireAdminSession, (req, res) => {
  const idx = dbState.entries.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Entry not found.' });
  const [removed] = dbState.entries.splice(idx, 1);
  dbState.promotions = dbState.promotions.filter((p) => p.entry_id !== removed.id);
  saveDatabase(dbState);
  res.json({ ok: true });
});

app.post('/api/admin/categories', requireAdminSession, (req, res) => {
  const { name, slug, description, icon, seo_title, seo_description, sort_order, is_active } =
    req.body || {};
  const cleanName = sanitizePlainText(name || '', 80);
  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Category name is required.' });
  }
  const cleanSlug = slugify(slug || cleanName);
  if (dbState.categories.some((c) => c.slug === cleanSlug)) {
    return res.status(409).json({ error: `A category with slug "${cleanSlug}" already exists.` });
  }

  const now = new Date().toISOString();
  const newCat: Category = {
    id: `cat-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    name: cleanName,
    slug: cleanSlug,
    description: sanitizePlainText(description || '', 500),
    icon: sanitizePlainText(icon || 'Folder', 40),
    seo_title: sanitizePlainText(seo_title || `${cleanName} WhatsApp Groups & Channels — WT-LINKS`, 120),
    seo_description: sanitizePlainText(
      seo_description || `Explore verified ${cleanName} WhatsApp groups and channels on WT-LINKS.`,
      240
    ),
    sort_order: Number(sort_order) || dbState.categories.length + 1,
    is_active: is_active !== false,
    created_at: now,
    updated_at: now,
  };

  dbState.categories.push(newCat);
  saveDatabase(dbState);
  res.status(201).json({ category: newCat });
});

app.put('/api/admin/categories/:id', requireAdminSession, (req, res) => {
  const cat = dbState.categories.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found.' });

  const { name, slug, description, icon, seo_title, seo_description, sort_order, is_active } =
    req.body || {};

  if (typeof name === 'string' && name.trim().length >= 2) {
    cat.name = sanitizePlainText(name, 80);
  }
  if (typeof slug === 'string' && slug.trim()) {
    const nextSlug = slugify(slug);
    if (dbState.categories.some((c) => c.id !== cat.id && c.slug === nextSlug)) {
      return res.status(409).json({ error: `Slug "${nextSlug}" is already in use.` });
    }
    cat.slug = nextSlug;
  }
  if (typeof description === 'string') cat.description = sanitizePlainText(description, 500);
  if (typeof icon === 'string') cat.icon = sanitizePlainText(icon, 40);
  if (typeof seo_title === 'string') cat.seo_title = sanitizePlainText(seo_title, 120);
  if (typeof seo_description === 'string')
    cat.seo_description = sanitizePlainText(seo_description, 240);
  if (sort_order !== undefined) cat.sort_order = Number(sort_order) || cat.sort_order;
  if (typeof is_active === 'boolean') cat.is_active = is_active;

  cat.updated_at = new Date().toISOString();
  saveDatabase(dbState);
  res.json({ category: cat });
});

app.delete('/api/admin/categories/:id', requireAdminSession, (req, res) => {
  const targetId = req.params.id;
  const reassignToId = (req.query.reassignTo as string) || '';
  const idx = dbState.categories.findIndex((c) => c.id === targetId);
  if (idx === -1) return res.status(404).json({ error: 'Category not found.' });
  if (dbState.categories.length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last remaining category.' });
  }

  const fallbackCat =
    dbState.categories.find((c) => c.id === reassignToId && c.id !== targetId) ||
    dbState.categories.find((c) => c.slug === 'other' && c.id !== targetId) ||
    dbState.categories.find((c) => c.id !== targetId)!;

  for (const entry of dbState.entries) {
    if (entry.category_id === targetId) {
      entry.category_id = fallbackCat.id;
    }
  }

  dbState.categories.splice(idx, 1);
  saveDatabase(dbState);
  res.json({ ok: true, reassignedTo: fallbackCat.name });
});

app.post('/api/admin/promotions', requireAdminSession, (req, res) => {
  const { entry_id, duration_days = 7, price = 1000, currency = 'PKR', display_order } =
    req.body || {};
  const entry = dbState.entries.find((e) => e.id === entry_id);
  if (!entry) return res.status(404).json({ error: 'Target entry not found.' });

  const existingActive = dbState.promotions.find(
    (p) => p.entry_id === entry.id && isPromotionCurrentlyActive(p)
  );

  const check = canActivatePromotion(dbState.promotions, existingActive?.id);
  if (!check.allowed) {
    return res.status(400).json({ error: check.reason });
  }

  const days = Math.min(365, Math.max(1, Number(duration_days) || 7));
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + days * 86400_000);

  if (existingActive) {
    existingActive.duration_days = days;
    existingActive.price = Number(price) || 0;
    existingActive.currency = currency || 'PKR';
    existingActive.end_at = endAt.toISOString();
    if (display_order !== undefined) existingActive.display_order = Number(display_order) || 1;
    existingActive.updated_at = startAt.toISOString();
    entry.is_featured = true;
    saveDatabase(dbState);
    return res.json({ promotion: existingActive });
  }

  const newPromo: Promotion = {
    id: `promo-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    entry_id: entry.id,
    status: 'active',
    price: Number(price) || 0,
    currency: sanitizePlainText(currency || 'PKR', 10),
    duration_days: days,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    display_order:
      Number(display_order) ||
      dbState.promotions.filter((p) => isPromotionCurrentlyActive(p)).length + 1,
    created_at: startAt.toISOString(),
    updated_at: startAt.toISOString(),
  };

  dbState.promotions.push(newPromo);
  entry.is_featured = true;
  saveDatabase(dbState);

  res.status(201).json({ promotion: newPromo });
});

app.put('/api/admin/promotions/:id', requireAdminSession, (req, res) => {
  const promo = dbState.promotions.find((p) => p.id === req.params.id);
  if (!promo) return res.status(404).json({ error: 'Promotion not found.' });

  const { status, display_order, duration_days, price } = req.body || {};

  if (status === 'active') {
    const check = canActivatePromotion(dbState.promotions, promo.id);
    if (!check.allowed) {
      return res.status(400).json({ error: check.reason });
    }
    promo.status = 'active';
    if (Date.parse(promo.end_at) <= Date.now()) {
      const days = Number(duration_days) || promo.duration_days || 7;
      promo.end_at = new Date(Date.now() + days * 86400_000).toISOString();
    }
  } else if (status === 'expired' || status === 'cancelled') {
    promo.status = status;
  }

  if (display_order !== undefined) promo.display_order = Number(display_order) || 1;
  if (price !== undefined) promo.price = Number(price) || 0;
  if (duration_days !== undefined) {
    const days = Math.min(365, Math.max(1, Number(duration_days) || 7));
    promo.duration_days = days;
    promo.end_at = new Date(Date.parse(promo.start_at) + days * 86400_000).toISOString();
  }

  promo.updated_at = new Date().toISOString();
  syncPromotionsAndEnrichEntries();
  saveDatabase(dbState);
  res.json({ promotion: promo });
});

app.put('/api/admin/promotion-requests/:id', requireAdminSession, (req, res) => {
  const pr = dbState.promotion_requests.find((r) => r.id === req.params.id);
  if (!pr) return res.status(404).json({ error: 'Promotion request not found.' });

  const { status, admin_notes, duration_days, price } = req.body || {};
  if (typeof admin_notes === 'string') {
    pr.admin_notes = sanitizePlainText(admin_notes, 500);
  }

  if (status === 'approved') {
    const check = canActivatePromotion(dbState.promotions);
    if (!check.allowed) {
      return res.status(400).json({ error: check.reason });
    }
    const days = Number(duration_days) || pr.requested_duration || 7;
    const now = new Date();
    const endAt = new Date(now.getTime() + days * 86400_000);

    const newPromo: Promotion = {
      id: `promo-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      entry_id: pr.entry_id,
      status: 'active',
      price: Number(price ?? pr.requested_price) || 1000,
      currency: 'PKR',
      duration_days: days,
      start_at: now.toISOString(),
      end_at: endAt.toISOString(),
      display_order: check.activeCount + 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    dbState.promotions.push(newPromo);
    pr.status = 'approved';
    pr.reviewed_at = now.toISOString();
  } else if (status === 'rejected') {
    pr.status = 'rejected';
    pr.reviewed_at = new Date().toISOString();
  }

  syncPromotionsAndEnrichEntries();
  saveDatabase(dbState);
  res.json({ request: pr });
});

app.put('/api/admin/reports/:id', requireAdminSession, (req, res) => {
  const rep = dbState.reports.find((r) => r.id === req.params.id);
  if (!rep) return res.status(404).json({ error: 'Report not found.' });

  const { status, admin_notes, entryAction } = req.body || {};
  if (status === 'pending' || status === 'reviewed' || status === 'dismissed') {
    rep.status = status;
    rep.reviewed_at = new Date().toISOString();
  }
  if (typeof admin_notes === 'string') {
    rep.admin_notes = sanitizePlainText(admin_notes, 500);
  }

  const entry = dbState.entries.find((e) => e.id === rep.entry_id);
  if (entry && entryAction === 'archive') {
    entry.status = 'archived';
    entry.updated_at = new Date().toISOString();
  } else if (entry && entryAction === 'restore') {
    entry.status = 'published';
    entry.updated_at = new Date().toISOString();
  }

  saveDatabase(dbState);
  res.json({ report: rep });
});

app.post('/api/admin/blogs', requireAdminSession, (req, res) => {
  const {
    title,
    slug,
    excerpt,
    content,
    featured_image,
    seo_title,
    seo_description,
    category,
    tags,
    status,
  } = req.body || {};

  const cleanTitle = sanitizePlainText(title || '', 180);
  if (cleanTitle.length < 3) {
    return res.status(400).json({ error: 'Blog post title is required.' });
  }

  let cleanSlug = slugify(slug || cleanTitle);
  if (dbState.blog_posts.some((b) => b.slug === cleanSlug)) {
    cleanSlug = `${cleanSlug}-${crypto.randomBytes(2).toString('hex')}`;
  }

  const cleanContent = sanitizeHtmlContent(content || '<p></p>');
  const now = new Date().toISOString();
  const post: BlogPost = {
    id: `blog-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    title: cleanTitle,
    slug: cleanSlug,
    excerpt: sanitizePlainText(excerpt || cleanTitle, 400),
    content: cleanContent,
    featured_image: featured_image || '/src/assets/images/blog_study_groups_1793511059111.jpg',
    seo_title: sanitizePlainText(seo_title || `${cleanTitle} — WT-LINKS Blog`, 160),
    seo_description: sanitizePlainText(seo_description || excerpt || cleanTitle, 260),
    category: sanitizePlainText(category || 'Community Guides', 60),
    tags: Array.isArray(tags)
      ? tags.map((t) => sanitizePlainText(String(t), 30)).filter(Boolean)
      : String(tags || '')
          .split(',')
          .map((t) => sanitizePlainText(t, 30))
          .filter(Boolean),
    status: status === 'draft' ? 'draft' : 'published',
    published_at: now,
    created_at: now,
    updated_at: now,
  };

  dbState.blog_posts.unshift(post);
  saveDatabase(dbState);
  res.status(201).json({ post });
});

app.put('/api/admin/blogs/:id', requireAdminSession, (req, res) => {
  const post = dbState.blog_posts.find((b) => b.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Blog post not found.' });

  const {
    title,
    slug,
    excerpt,
    content,
    featured_image,
    seo_title,
    seo_description,
    category,
    tags,
    status,
  } = req.body || {};

  if (typeof title === 'string' && title.trim().length >= 3) {
    post.title = sanitizePlainText(title, 180);
  }
  if (typeof slug === 'string' && slug.trim()) {
    const nextSlug = slugify(slug);
    if (!dbState.blog_posts.some((b) => b.id !== post.id && b.slug === nextSlug)) {
      post.slug = nextSlug;
    }
  }
  if (typeof excerpt === 'string') post.excerpt = sanitizePlainText(excerpt, 400);
  if (typeof content === 'string') post.content = sanitizeHtmlContent(content);
  if (typeof featured_image === 'string') post.featured_image = featured_image;
  if (typeof seo_title === 'string') post.seo_title = sanitizePlainText(seo_title, 160);
  if (typeof seo_description === 'string')
    post.seo_description = sanitizePlainText(seo_description, 260);
  if (typeof category === 'string') post.category = sanitizePlainText(category, 60);
  if (tags !== undefined) {
    post.tags = Array.isArray(tags)
      ? tags.map((t) => sanitizePlainText(String(t), 30)).filter(Boolean)
      : String(tags)
          .split(',')
          .map((t) => sanitizePlainText(t, 30))
          .filter(Boolean);
  }
  if (status === 'draft' || status === 'published') {
    post.status = status;
  }

  post.updated_at = new Date().toISOString();
  saveDatabase(dbState);
  res.json({ post });
});

app.delete('/api/admin/blogs/:id', requireAdminSession, (req, res) => {
  const idx = dbState.blog_posts.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Blog post not found.' });
  dbState.blog_posts.splice(idx, 1);
  saveDatabase(dbState);
  res.json({ ok: true });
});

app.put('/api/admin/settings', requireAdminSession, (req, res) => {
  const updates = req.body || {};
  dbState.settings = {
    ...dbState.settings,
    ...updates,
    ads: {
      ...dbState.settings.ads,
      ...(updates.ads || {}),
    },
  };
  saveDatabase(dbState);
  res.json({ settings: dbState.settings });
});

async function startStandaloneServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WT-LINKS Server running on http://0.0.0.0:${PORT}`);
  });
}

// Start listener when running as a standalone Node/Container server (skipped in Vercel Serverless runtime)
if (!process.env.VERCEL && !process.env.NOW_REGION) {
  startStandaloneServer();
}

export default app;
