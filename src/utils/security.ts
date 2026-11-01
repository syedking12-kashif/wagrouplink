import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

/**
 * Default bcrypt ($2y$12$) hash for admin user `syedking12`.
 * Plaintext password is NEVER stored in source code.
 */
export const DEFAULT_ADMIN_USERNAME = 'syedking12';
export const DEFAULT_ADMIN_PASSWORD_HASH =
  '$2y$12$6WVElVwcywwCOswV8L4yeOHTrU072UXds.1Nt79mb46LYfzoIWEca';

export function hashPassword(password: string, cost = 12): string {
  const salt = bcrypt.genSaltSync(cost);
  const hashed = bcrypt.hashSync(password, salt);
  // Output with $2y$ prefix for compatibility with standard bcrypt / Vercel env configs
  return hashed.replace(/^\$2[ab]\$/, '$2y$');
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!password || !storedHash) return false;
    const trimmedHash = storedHash.trim();

    // 1. Bcrypt ($2y$, $2b$, $2a$) verification
    if (
      trimmedHash.startsWith('$2y$') ||
      trimmedHash.startsWith('$2b$') ||
      trimmedHash.startsWith('$2a$')
    ) {
      // bcryptjs handles $2a$ and $2b$ natively; normalize $2y$ to $2a$ for identical blowfish evaluation
      const normalizedBcrypt = trimmedHash.replace(/^\$2y\$/, '$2a$');
      return bcrypt.compareSync(password, normalizedBcrypt);
    }

    // 2. Fallback support for scrypt$<salt>$<derivedKey> format
    if (trimmedHash.startsWith('scrypt$')) {
      const parts = trimmedHash.split('$');
      if (parts.length !== 3) return false;
      const [, salt, keyHex] = parts;
      if (!salt || !keyHex) return false;

      const keyBuffer = Buffer.from(keyHex, 'hex');
      const derivedBuffer = crypto.scryptSync(password, salt, 64);
      if (keyBuffer.length !== derivedBuffer.length) return false;
      return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Stateless HMAC-SHA256 signed session token for Vercel Serverless & Node compatibility.
 */
export function createAdminSessionToken(
  username: string,
  secret: string,
  ttlMs: number = 1000 * 60 * 60 * 12
): string {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${Buffer.from(username, 'utf8').toString('base64url')}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string, secret: string): string | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [userB64, expStr, providedSig] = parts;
    const expiresAt = Number(expStr);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

    const payload = `${userB64}.${expStr}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');

    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    return Buffer.from(userB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export interface ParsedWhatsAppUrl {
  isValid: boolean;
  type?: 'group' | 'channel';
  normalizedUrl?: string;
  inviteCode?: string;
  error?: string;
}

/**
 * Strictly validates and normalizes WhatsApp Group & Channel invite URLs.
 * Rejects arbitrary external URLs to prevent spam and SSRF.
 */
export function validateAndNormalizeWhatsAppUrl(rawUrl: string): ParsedWhatsAppUrl {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Please enter a WhatsApp invite link.' };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format. Must start with https://chat.whatsapp.com/ or https://whatsapp.com/channel/.',
    };
  }

  if (parsed.protocol !== 'https:') {
    return { isValid: false, error: 'WhatsApp invite links must use HTTPS.' };
  }

  const host = parsed.hostname.toLowerCase();
  const pathParts = parsed.pathname.split('/').filter(Boolean);

  // Case 1: Group link -> https://chat.whatsapp.com/<code_or_invite>
  if (host === 'chat.whatsapp.com') {
    const code = pathParts[0] === 'invite' ? pathParts[1] : pathParts[0];
    if (!code || !/^[A-Za-z0-9_-]{10,48}$/.test(code)) {
      return {
        isValid: false,
        error: 'Invalid WhatsApp group invite code. Expected https://chat.whatsapp.com/<invite-code>.',
      };
    }
    return {
      isValid: true,
      type: 'group',
      inviteCode: code,
      normalizedUrl: `https://chat.whatsapp.com/${code}`,
    };
  }

  // Case 2: Channel link -> https://whatsapp.com/channel/<code> or https://www.whatsapp.com/channel/<code>
  if (host === 'whatsapp.com' || host === 'www.whatsapp.com') {
    if (pathParts[0] === 'channel' && pathParts[1] && /^[A-Za-z0-9_-]{8,48}$/.test(pathParts[1])) {
      const code = pathParts[1];
      return {
        isValid: true,
        type: 'channel',
        inviteCode: code,
        normalizedUrl: `https://whatsapp.com/channel/${code}`,
      };
    }
    return {
      isValid: false,
      error: 'Invalid WhatsApp channel link. Expected https://whatsapp.com/channel/<channel-id>.',
    };
  }

  return {
    isValid: false,
    error: 'Only official WhatsApp invite links (chat.whatsapp.com or whatsapp.com/channel) are accepted.',
  };
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#039': "'",
  nbsp: ' ',
  bull: '•',
  middot: '·',
  ndash: '–',
  mdash: '—',
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
  hellip: '...',
  copy: '(c)',
  reg: '(R)',
  trade: '(TM)',
};

/**
 * Decodes hexadecimal (&#x1d47e;), decimal (&#1234;), and named (&amp;) HTML entities,
 * strips truncated trailing entity fragments (&#x...), removes invisible directional marks,
 * and normalizes mathematical fancy Unicode letters into clean, natural text.
 */
export function decodeHtmlEntities(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw.replace(/&#x?[0-9a-fA-F]*$/i, '');

  for (let pass = 0; pass < 2; pass++) {
    text = text.replace(/&#x([0-9a-fA-F]{1,6});?/gi, (full, hex) => {
      const cp = parseInt(hex, 16);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return full;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return full;
      }
    });

    text = text.replace(/&#([0-9]{1,7});?/g, (full, dec) => {
      const cp = parseInt(dec, 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return full;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return full;
      }
    });

    text = text.replace(/&([a-zA-Z0-9#]+);/g, (full, name) => {
      const lower = name.toLowerCase();
      return NAMED_ENTITIES[lower] ?? full;
    });
  }

  return text;
}

export function decodeAndCleanMetadataText(
  input: string,
  maxLength = 500,
  options: { stripChannelPrefix?: boolean } = {}
): string {
  if (!input || typeof input !== 'string') return '';

  let cleaned = decodeHtmlEntities(input)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u3010\u3016\u3014\u3018\u301a]/g, '[')
    .replace(/[\u3011\u3017\u3015\u3019\u301b]/g, ']')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '');

  try {
    cleaned = cleaned.normalize('NFKC');
  } catch {
    // Ignore normalization failure
  }

  if (options.stripChannelPrefix) {
    cleaned = cleaned.replace(
      /^(?:WhatsApp\s+)?(?:Channel|Group(?:\s+Invite)?)\s*[\u2022\u00b7|\-\u2013\u2014]\s*(?:[\d,.]+\s*[KMBkmb]?\s*(?:followers?|members?|subscribers?)\s*[\u2022\u00b7|\-\u2013\u2014]\s*)?/i,
      ''
    );
  }

  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.startsWith('[') && !cleaned.includes(']')) {
    cleaned = `${cleaned}]`;
  }

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength).trim();
  }

  return cleaned;
}

export function slugify(input: string): string {
  const decoded = decodeAndCleanMetadataText(input, 200);
  return (
    decoded
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'community-link'
  );
}

/**
 * Lightweight server-side HTML sanitizer for Blog CMS and descriptions.
 */
export function sanitizeHtmlContent(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  return dirtyHtml
    .replace(/<\s*(script|iframe|object|embed|style|form|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|style|form|meta|link)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(
      /(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi,
      '$1="#"'
    );
}

export function sanitizePlainText(input: string, maxLength = 500): string {
  return decodeAndCleanMetadataText(input, maxLength);
}

/**
 * Checks whether a promotion is currently active based on status and expiration date.
 */
export function isPromotionCurrentlyActive(
  promo: { status: string; end_at: string },
  nowMs: number = Date.now()
): boolean {
  if (promo.status !== 'active') return false;
  const endMs = Date.parse(promo.end_at);
  if (Number.isNaN(endMs)) return false;
  return endMs > nowMs;
}

/**
 * Enforces the global maximum of 10 active promotions.
 */
export function canActivatePromotion(
  activePromotions: Array<{ id: string; status: string; end_at: string }>,
  candidateId?: string,
  nowMs: number = Date.now()
): { allowed: boolean; activeCount: number; reason?: string } {
  const activeCount = activePromotions.filter(
    (p) => p.id !== candidateId && isPromotionCurrentlyActive(p, nowMs)
  ).length;

  if (activeCount >= 10) {
    return {
      allowed: false,
      activeCount,
      reason:
        'Maximum of 10 active promotions reached globally. Deactivate or wait for an existing promotion to expire.',
    };
  }
  return { allowed: true, activeCount };
}

/**
 * Builds the exact URL-encoded WhatsApp promotion request URL for 923254038592.
 */
export function buildWhatsAppPromotionUrl(params: {
  whatsappNumber?: string;
  entryName: string;
  inviteUrl: string;
  publicPageUrl: string;
  durationLabel: string;
}): string {
  const phone = (params.whatsappNumber || '923254038592').replace(/[^0-9]/g, '');
  const message = `Assalamualaikum,

I want to promote my WhatsApp group/channel on WT-LINKS.

Name: ${params.entryName}

Link: ${params.inviteUrl}

WT-LINKS Page: ${params.publicPageUrl}

Requested Duration: ${params.durationLabel}

Please provide promotion details and payment information.

Thank you.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
