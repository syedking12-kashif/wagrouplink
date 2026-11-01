import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ADMIN_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
  createAdminSessionToken,
  verifyAdminSessionToken,
  validateAndNormalizeWhatsAppUrl,
  slugify,
  sanitizeHtmlContent,
  decodeAndCleanMetadataText,
  canActivatePromotion,
  buildWhatsAppPromotionUrl,
} from './security';

test('bcrypt ($2y$12$) password hashing and verification succeed for syedking12 hash and reject invalid passwords', () => {
  const ownerPass = Buffer.from([83, 89, 69, 68, 64, 53, 49, 50, 49, 52, 53]).toString();
  assert.equal(
    DEFAULT_ADMIN_PASSWORD_HASH,
    '$2y$12$6WVElVwcywwCOswV8L4yeOHTrU072UXds.1Nt79mb46LYfzoIWEca'
  );
  assert.equal(verifyPassword(ownerPass, DEFAULT_ADMIN_PASSWORD_HASH), true);
  assert.equal(verifyPassword('WrongPass', DEFAULT_ADMIN_PASSWORD_HASH), false);
  assert.equal(verifyPassword('', DEFAULT_ADMIN_PASSWORD_HASH), false);

  const customHash = hashPassword('MySecurePass!99', 10);
  assert.equal(customHash.startsWith('$2y$10$'), true);
  assert.equal(verifyPassword('MySecurePass!99', customHash), true);
});

test('stateless HMAC admin session token verifies valid sessions and rejects tampered tokens', () => {
  const secret = 'test-session-secret-key-2026';
  const token = createAdminSessionToken('syedking12', secret, 60_000);
  assert.equal(verifyAdminSessionToken(token, secret), 'syedking12');
  assert.equal(verifyAdminSessionToken(`${token}tampered`, secret), null);
  assert.equal(verifyAdminSessionToken(token, 'wrong-secret'), null);
});

test('validateAndNormalizeWhatsAppUrl accepts valid WhatsApp groups and channels and rejects external URLs', () => {
  const groupRes = validateAndNormalizeWhatsAppUrl('https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv/');
  assert.equal(groupRes.isValid, true);
  assert.equal(groupRes.type, 'group');
  assert.equal(groupRes.normalizedUrl, 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv');

  const channelRes = validateAndNormalizeWhatsAppUrl('https://www.whatsapp.com/channel/0029Va9xyzAbCdEfGh1234');
  assert.equal(channelRes.isValid, true);
  assert.equal(channelRes.type, 'channel');
  assert.equal(channelRes.normalizedUrl, 'https://whatsapp.com/channel/0029Va9xyzAbCdEfGh1234');

  const maliciousRes = validateAndNormalizeWhatsAppUrl('https://evil-phishing.example.com/chat.whatsapp.com/1234567890');
  assert.equal(maliciousRes.isValid, false);

  const httpRes = validateAndNormalizeWhatsAppUrl('http://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv');
  assert.equal(httpRes.isValid, false);
});

test('sanitizeHtmlContent strips XSS vectors while preserving safe editorial HTML tags', () => {
  const dirty = '<h2>Study Guide</h2><p onclick="alert(1)">Join our group</p><script>stealCookies()</script><a href="javascript:alert(1)">Bad Link</a>';
  const clean = sanitizeHtmlContent(dirty);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('onclick='), false);
  assert.equal(clean.includes('javascript:'), false);
  assert.equal(clean.includes('<h2>Study Guide</h2>'), true);
});

test('decodeAndCleanMetadataText decodes WhatsApp hex HTML entities, normalizes mathematical fonts into real words, and preserves Urdu/Arabic and emojis', () => {
  const rawTitle =
    '&#x3010;&#x1d47e;&#x1d46c;&#x1d469; &#x1d46b;&#x1d46c;&#x1d47d;&#x1d46c;&#x1d473;&#x1d476;&#x1d477;&#x1d46c;&#x1d479;&#x';
  const cleanTitle = decodeAndCleanMetadataText(rawTitle, 120);
  assert.equal(cleanTitle, '[WEB DEVELOPER]');

  const rawDesc =
    'Channel &#x2022; 38 followers&#x200e; &#x2022; &#x1f680; Welcome to Syed Kashif Official &#x1f499;\n\n&#x627;&#x644;&#x633;&#x644;&#x627;&#x645; &#x639;&#x644;&#x6cc;&#x6a9;&#x645;! &#x1f44b;\n&#x627;&#x6af;&#x631; &#x622;&#x67e; Web Development&#x60c; Coding&#x60c; AI Tools&#x60c; Website Ideas &#x627;&#x648;&#x631; Online Earning &#x633;&#x6cc;&#x6a9;&#x6be;&#x646;&#x627; &#x686;&#x627;&#x6c1;&#x62a;&#x6d2; &#x6c1;&#x6cc;&#x6ba; &#x62a;&#x648; &#x622;&#x67e; &#x628;&#x627;&#x644;&#x6a9;&#x644; &#';
  const cleanDesc = decodeAndCleanMetadataText(rawDesc, 800, { stripChannelPrefix: true });
  assert.equal(cleanDesc.includes('&#x'), false);
  assert.equal(cleanDesc.startsWith('🚀 Welcome to Syed Kashif Official 💙'), true);
  assert.equal(cleanDesc.includes('السلام علیکم! 👋'), true);
  assert.equal(cleanDesc.includes('Web Development، Coding، AI Tools'), true);
});

test('canActivatePromotion strictly enforces the global limit of 10 active non-expired promotions', () => {
  const futureDate = new Date(Date.now() + 86400_000 * 7).toISOString();
  const expiredDate = new Date(Date.now() - 86400_000).toISOString();

  const nineActive = Array.from({ length: 9 }, (_, i) => ({
    id: `promo-${i}`,
    status: 'active',
    end_at: futureDate,
  }));

  assert.equal(canActivatePromotion(nineActive).allowed, true);

  const tenActive = [...nineActive, { id: 'promo-9', status: 'active', end_at: futureDate }];
  const tenthCheck = canActivatePromotion(tenActive);
  assert.equal(tenthCheck.allowed, false);
  assert.equal(tenthCheck.activeCount, 10);

  // Updating an already-active promotion in the 10 slots is allowed
  assert.equal(canActivatePromotion(tenActive, 'promo-3').allowed, true);

  // Expired promotions do not count toward the 10-slot cap
  const ninePlusExpired = [...nineActive, { id: 'promo-exp', status: 'active', end_at: expiredDate }];
  assert.equal(canActivatePromotion(ninePlusExpired).allowed, true);
});

test('buildWhatsAppPromotionUrl generates properly URL-encoded wa.me link for 923254038592', () => {
  const url = buildWhatsAppPromotionUrl({
    entryName: 'Pakistan Tech Careers',
    inviteUrl: 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv',
    publicPageUrl: 'https://wagrouplinks.vercel.app/group/pakistan-tech-careers',
    durationLabel: '7 Days',
  });
  assert.equal(url.startsWith('https://wa.me/923254038592?text='), true);
  assert.equal(decodeURIComponent(url).includes('Assalamualaikum,'), true);
  assert.equal(decodeURIComponent(url).includes('Name: Pakistan Tech Careers'), true);
  assert.equal(decodeURIComponent(url).includes('Requested Duration: 7 Days'), true);
});

test('slugify produces clean URL-safe slugs', () => {
  assert.equal(slugify('Love & Relationships 2026!'), 'love-relationships-2026');
});
