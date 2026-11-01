# Security Specification — WT-LINKS

## 1. Data Invariants
1. **Default-Deny Catch-All**: Unmatched paths in Firestore are strictly denied (`allow read, write: if false;`).
2. **Path Variable Hardening**: Every document ID path variable (`categoryId`, `entryId`, `promotionId`, `reportId`, `postId`) must match `^[a-zA-Z0-9_\-]+$` and be `<= 128` characters.
3. **Public Read Boundaries**:
   - Categories are readable only when `resource.data.is_active == true` or user is admin.
   - Directory entries are readable only when `resource.data.status == 'published'` or user is admin.
   - Blog posts are readable only when `resource.data.status == 'published'` or user is admin.
   - Reports are strictly restricted to admins (`isAdmin()`).
4. **Strict Key & Size Validation**: Every create/update operation validates required keys, allowed keys (`hasOnly`), string maxLengths, and enum values.
5. **Admin Verification**: Admin privileges require `request.auth != null && request.auth.token.email_verified == true && (request.auth.token.email == 'syedtaseerrazashah55@gmail.com' || exists(/databases/$(database)/documents/admins/$(request.auth.uid)))`.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on Entry**: `{ id: "e1", type: "group", name: "Test", slug: "test", invite_url: "https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv", category_id: "islamic", status: "published", is_featured: true, total_clicks: 99999, isAdmin: true }` -> Rejected by `hasOnly` and `is_featured == false` / `total_clicks == 0` on public creation.
2. **Oversized ID Poisoning**: Document ID of 1500 characters -> Rejected by `isValidId()`.
3. **Unpublished Blog Read by Public**: `get /blog_posts/draft-1` where `status == 'draft'` -> Rejected because `resource.data.status == 'published'` is required.
4. **Archived Group Read by Public**: `get /directory_entries/arch-1` where `status == 'archived'` -> Rejected.
5. **Report Scraping by Public**: `get /reports/rep-1` -> Rejected (`allow read: if isAdmin()`).
6. **Self-Promoted Group Submission**: Public user creates entry with `is_featured: true` -> Rejected (`incoming().is_featured == false`).
7. **Click Counter Manipulation**: Public user creates entry with `total_clicks: 5000` -> Rejected (`incoming().total_clicks == 0`).
8. **Arbitrary External Invite URL**: Public user submits `invite_url: "https://evil.example.com"` -> Rejected by regex check requiring WhatsApp domain.
9. **Unauthorized Promotion Creation**: Non-admin creates document in `/promotions/p1` -> Rejected (`allow write: if isAdmin()`).
10. **Unverified Admin Email Spoof**: User with `email_verified == false` attempts admin write -> Rejected by `request.auth.token.email_verified == true`.
11. **Oversized Description Payload**: Entry description with 10,000 chars -> Rejected by `size() <= 1000`.
12. **Terminal Status Bypass on Report**: Non-admin attempts to update report status -> Rejected.
