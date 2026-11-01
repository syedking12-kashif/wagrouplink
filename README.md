# WT-LINKS — WhatsApp Group & Channel Directory

**Brand:** SK MODS  
**Developer:** Syed Kashif  
**Canonical Website:** [https://wagrouplinks.vercel.app](https://wagrouplinks.vercel.app)  
**Contact Email:** syedkashifrazashah14@gmail.com  
**WhatsApp:** [https://wa.me/923254038592](https://wa.me/923254038592)  
**Instagram:** [@Syed_pro_dev](https://instagram.com/Syed_pro_dev)

---

## 1. Project Overview

**WT-LINKS** is a production-grade, SEO-optimized WhatsApp Group and Channel discovery, submission, promotion, and community publishing platform built under the **SK MODS** brand by **Syed Kashif**. Users can discover verified communities across 20+ categories, submit new groups or channels without creating an account, preview automatically extracted metadata, request featured promotion slots via WhatsApp, and read community guides. Administrators manage the entire platform via the private `/sk` (and `/SK`) dashboard.

---

## 2. Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Light/Dark Theme Persistence (`localStorage` + system preference)
- **Backend API & Vercel Serverless:** Express + Node.js (`server.ts` + `/api/index.ts`), `vercel.json` routing, stateless HMAC-SHA256 signed `HttpOnly` session cookies, rate limiting, server-side OpenGraph metadata fetcher with caching
- **Database & Persistence:** Cloud Firestore (`firebase-applet-config.json` + `firestore.rules`) & Supabase PostgreSQL (`supabase/migrations/001_initial_schema.sql`)
- **Security:** `bcrypt` cost-12 (`$2y$12$`) password hashing, strict WhatsApp URL validation, stored XSS HTML sanitization, server-side click deduplication

---

## 3. Local Setup

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and configure any custom environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the full-stack development server on port `3000`:
   ```bash
   npm run dev
   ```
4. Run the unit test suite:
   ```bash
   npx --yes tsx --test src/utils/security.test.ts
   ```

---

## 4. Supabase Configuration

1. Create a new Supabase project at [https://supabase.com](https://supabase.com).
2. Create a public storage bucket named `wt-links-media` for group icons, channel avatars, and blog images.
3. Copy your project URL, `anon` public key, and `service_role` secret key into `.env` (or Vercel Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 5. Database Migration Instructions

Run the complete SQL schema and Row Level Security (RLS) migration in the Supabase SQL Editor or via the Supabase CLI:

```bash
supabase db push
# Or paste supabase/migrations/001_initial_schema.sql directly into the Supabase SQL Editor
```

The migration creates `categories`, `directory_entries`, `promotions` (with a PostgreSQL trigger enforcing a strict maximum of 10 active promotions), `promotion_requests`, `click_events`, `reports`, `blog_posts`, `blog_categories`, `blog_tags`, `website_settings`, and `metadata_cache`.

---

## 6. Admin Password Setup

- The private admin dashboard is located at `/sk` (case-insensitive, also accessible via `/SK`).
- Default username: `syedking12`
- Default `ADMIN_PASSWORD_HASH`: `$2y$12$6WVElVwcywwCOswV8L4yeOHTrU072UXds.1Nt79mb46LYfzoIWEca`
- Passwords are **never** stored in plaintext. Authentication verifies credentials against a bcrypt cost-12 hash (`$2y$12$...`) using `bcryptjs`.
- When setting `ADMIN_PASSWORD_HASH` in `.env` or Vercel Environment Variables, use:
  ```env
  ADMIN_USERNAME="syedking12"
  ADMIN_PASSWORD_HASH="$2y$12$6WVElVwcywwCOswV8L4yeOHTrU072UXds.1Nt79mb46LYfzoIWEca"
  ```

---

## 7. Metadata Provider Configuration

When a user pastes a valid WhatsApp invite link (`https://chat.whatsapp.com/...` or `https://whatsapp.com/channel/...`):
1. The server normalizes and validates the invite URL.
2. It checks the server-side metadata cache (`metadata_cache`) to avoid repeated network fetches.
3. Using `WHATSAPP_METADATA_PROVIDER="live_og"` (or `"custom_api"` with `WHATSAPP_METADATA_API_KEY`), the backend safely requests OpenGraph tags (`og:title`, `og:description`, `og:image`).
4. If WhatsApp blocks automated metadata retrieval or returns generic placeholders, the UI displays a clear notice and enables immediate manual entry and profile image upload.

---

## 8. Addsterra Configuration

Administrators can configure and toggle Addsterra ad placements directly inside `/SK` -> **Advertisement Settings** (or via `ADDSTERRA_PUBLISHER_ID` and `ADDSTERRA_AD_CODE` environment variables) across 5 independent slots:
1. Homepage banner
2. Category directory pages
3. Group & Channel detail pages
4. Link submission flow
5. Blog articles

If no publisher code is supplied or a slot is disabled, the layout collapses cleanly without blocking submissions or displaying deceptive buttons.

---

## 9. Vercel Deployment

The repository includes `vercel.json` and the serverless entry point `/api/index.ts` pre-configured for zero-config Vercel deployment:
1. Push the repository to GitHub/GitLab.
2. Import the project into Vercel (`vercel.json` automatically configures `buildCommand: "npm run build"`, `outputDirectory: "dist"`, API/SEO rewrites to `/api/index.ts`, and SPA fallback to `/index.html`).
3. Configure the environment variables listed in `.env.example` inside the Vercel Project Settings (note: in Vercel's UI, paste `$2y$12$6WVElVwcywwCOswV8L4yeOHTrU072UXds.1Nt79mb46LYfzoIWEca` directly as the value of `ADMIN_PASSWORD_HASH`).
4. Deploy. Serverless invocations use stateless HMAC-signed session cookies (`wt_admin_session`) and writable `/tmp/wt-links-data` fallback storage.

---

## 10. Domain Configuration

Set `NEXT_PUBLIC_SITE_URL=https://wagrouplinks.vercel.app` and `APP_URL=https://wagrouplinks.vercel.app`. Both `/sitemap.xml` and `/robots.txt` automatically generate canonical URLs pointing to `https://wagrouplinks.vercel.app` while excluding `/sk` and `/SK` from search indexing.

---

## 11. Security Notes

- **HTTP-Only Sessions:** Admin sessions use signed `HttpOnly`, `SameSite=Lax` cookies (`wt_admin_session`) with automatic expiration.
- **Rate Limiting:** Login attempts, link submissions, click tracking, and abuse reports are rate-limited per visitor hash.
- **Stored XSS Prevention:** All blog HTML content and user descriptions are sanitized server-side before storage.
- **SSRF Protection:** Only strict WhatsApp invite domains (`chat.whatsapp.com`, `whatsapp.com/channel`, `www.whatsapp.com/channel`) are queried by the metadata service.
