import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Upload,
  Loader2,
  Link2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Category, DirectoryEntry, SiteSettings } from '../types';
import { AdPlacement } from './AdPlacement';
import { mirrorPublicSubmissionToFirestore } from '../lib/firebase';

interface SubmitViewProps {
  categories: Category[];
  settings: SiteSettings;
  onSubmitted: (entry: DirectoryEntry) => void;
  onNavigate: (path: string) => void;
}

export function SubmitView({
  categories,
  settings,
  onSubmitted,
  onNavigate,
}: SubmitViewProps) {
  const [type, setType] = useState<'group' | 'channel'>('group');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || 'cat-1');
  const [inviteUrl, setInviteUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [followerHint, setFollowerHint] = useState<string | null>(null);

  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaResult, setMetaResult] = useState<{
    attempted: boolean;
    autoFetched: boolean;
    message?: string;
    normalizedUrl?: string;
  }>({ attempted: false, autoFetched: false });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    entry: DirectoryEntry;
    publicPath: string;
    publicUrl: string;
  } | null>(null);

  const lastAutoFetchedUrlRef = useRef<string>('');

  const handleFetchMetadata = async (urlToInspect?: string, isSilentAuto = false) => {
    const targetUrl = (urlToInspect ?? inviteUrl).trim();
    if (!targetUrl) {
      if (!isSilentAuto) {
        setError('Please paste a valid WhatsApp group or channel invite link first.');
      }
      return;
    }

    setError(null);
    setFetchingMeta(true);
    try {
      const res = await fetch('/api/metadata/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteUrl: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (!isSilentAuto) {
          setError(data.error || 'Invalid WhatsApp invite URL.');
        }
        setMetaResult({ attempted: false, autoFetched: false });
        return;
      }

      if (data.type === 'group' || data.type === 'channel') {
        setType(data.type);
      }
      if (data.normalizedUrl) {
        lastAutoFetchedUrlRef.current = data.normalizedUrl;
        setInviteUrl(data.normalizedUrl);
      }
      if (data.followerHint) {
        setFollowerHint(data.followerHint);
      } else {
        setFollowerHint(null);
      }

      if (data.autoFetched && data.title) {
        setName(data.title);
        if (data.description) setDescription(data.description);
        if (data.imageUrl) setImageUrl(data.imageUrl);
        setMetaResult({
          attempted: true,
          autoFetched: true,
          normalizedUrl: data.normalizedUrl,
          message: `Real-time metadata${
            data.imageUrl ? ' and profile picture' : ''
          }${data.followerHint ? ` (${data.followerHint})` : ''} retrieved automatically. You may customize any field below before publishing.`,
        });
      } else {
        setMetaResult({
          attempted: true,
          autoFetched: false,
          normalizedUrl: data.normalizedUrl,
          message:
            data.fallbackMessage ||
            "We couldn't automatically retrieve this group's information. Please enter the group name and upload its profile picture.",
        });
      }
    } catch {
      if (!isSilentAuto) {
        setMetaResult({
          attempted: true,
          autoFetched: false,
          message:
            "We couldn't automatically retrieve this group's information. Please enter the group name and upload its profile picture.",
        });
      }
    } finally {
      setFetchingMeta(false);
    }
  };

  // Automatically fetch metadata & profile image in real time when a valid WhatsApp URL is pasted or typed
  useEffect(() => {
    const trimmed = inviteUrl.trim();
    const looksLikeWhatsAppInvite =
      /^https:\/\/chat\.whatsapp\.com\/(?:invite\/)?[A-Za-z0-9_-]{10,48}\/?$/i.test(trimmed) ||
      /^https:\/\/(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]{8,48}\/?$/i.test(trimmed);

    if (!looksLikeWhatsAppInvite) return;
    const normalizedCheck = trimmed.replace(/\/$/, '');
    if (lastAutoFetchedUrlRef.current === normalizedCheck) return;

    const timer = window.setTimeout(() => {
      lastAutoFetchedUrlRef.current = normalizedCheck;
      handleFetchMetadata(trimmed, true);
    }, 300);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteUrl]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Unsupported image file type. Please select a PNG, JPG, or WebP file.');
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setError('Image size must be under 2.5 MB.');
      return;
    }

    setUploadingImage(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, fileName: file.name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to upload profile image.');
        } else {
          setImageUrl(data.imageUrl);
        }
      } catch {
        setError('Image upload failed. Please try again.');
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          categoryId,
          inviteUrl,
          name,
          description,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not publish link. Please check your inputs.');
        return;
      }

      const entry: DirectoryEntry = data.entry;
      mirrorPublicSubmissionToFirestore('directory_entries', entry.id, {
        id: entry.id,
        type: entry.type,
        name: entry.name,
        slug: entry.slug,
        invite_url: entry.invite_url,
        description: entry.description,
        image_url: entry.image_url,
        category_id: entry.category_id,
        status: 'published',
        is_featured: false,
        total_clicks: 0,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        published_at: entry.published_at,
      });

      onSubmitted(entry);
      setCreatedResult({
        entry,
        publicPath: data.publicPath,
        publicUrl: data.publicUrl,
      });
    } catch {
      setError('Network error while submitting link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj =
    categories.find((c) => c.id === categoryId) || categories[0];

  if (createdResult) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[#DCFCE7] dark:bg-emerald-950 text-[#16A34A] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Your WhatsApp {createdResult.entry.type === 'group' ? 'Group' : 'Channel'} is Live!
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            <strong>{createdResult.entry.name}</strong> has been published immediately to the{' '}
            {createdResult.entry.category_name} directory on WT-LINKS.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 p-4 text-left">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Public WT-LINKS URL
            </div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono-tabular text-slate-900 dark:text-slate-100 truncate">
                {createdResult.publicUrl}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(createdResult.publicUrl)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] cursor-pointer shrink-0"
              >
                Copy URL
              </button>
            </div>
          </div>

          <AdPlacement slot="submit" ads={settings.ads} />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate(createdResult.publicPath)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors cursor-pointer"
            >
              <span>View Public Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedResult(null);
                setInviteUrl('');
                setName('');
                setDescription('');
                setImageUrl('');
                setMetaResult({ attempted: false, autoFetched: false });
              }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Submit Another Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400 mb-1">
          Instant Community Publishing · No Account Required
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Submit a WhatsApp Group or Channel
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Share your community with thousands of daily visitors on WT-LINKS. Paste your official
          WhatsApp invite URL below to validate and preview your listing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Select Submission Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              01. Select Submission Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('group')}
                className={`py-3 px-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  type === 'group'
                    ? 'border-[#16A34A] bg-[#DCFCE7]/50 dark:bg-emerald-950/60 text-slate-900 dark:text-slate-100'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold">WhatsApp Group</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  chat.whatsapp.com/...
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType('channel')}
                className={`py-3 px-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  type === 'channel'
                    ? 'border-[#16A34A] bg-[#DCFCE7]/50 dark:bg-emerald-950/60 text-slate-900 dark:text-slate-100'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold">WhatsApp Channel</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  whatsapp.com/channel/...
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Select Category */}
          <div>
            <label
              htmlFor="submit-category"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              02. Select Category
            </label>
            <select
              id="submit-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#16A34A]"
            >
              {categories
                .filter((c) => c.is_active)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Step 3: Enter WhatsApp Invite Link */}
          <div>
            <label
              htmlFor="submit-invite-url"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              03. Enter Official WhatsApp Invite Link
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="submit-invite-url"
                  type="url"
                  required
                  value={inviteUrl}
                  onChange={(e) => setInviteUrl(e.target.value)}
                  placeholder={
                    type === 'group'
                      ? 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv'
                      : 'https://whatsapp.com/channel/0029VaAbCdEfGhIjKlMn'
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#16A34A]"
                />
              </div>
              <button
                type="button"
                disabled={fetchingMeta}
                onClick={() => handleFetchMetadata()}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {fetchingMeta ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Fetching Info...
                  </span>
                ) : (
                  'Fetch Link Info'
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Supported formats: <code>https://chat.whatsapp.com/...</code> or{' '}
              <code>https://whatsapp.com/channel/...</code>
            </p>
          </div>

          {/* Step 4: Metadata Result & Manual Customization */}
          {metaResult.attempted && (
            <div
              className={`rounded-xl border p-3.5 text-xs leading-relaxed ${
                metaResult.autoFetched
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'border-amber-200 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
              }`}
            >
              {metaResult.message}
            </div>
          )}

          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              04. Community Details &amp; Profile Picture
            </div>

            <div>
              <label
                htmlFor="submit-name"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
              >
                {type === 'group' ? 'Group Name' : 'Channel Name'} *
              </label>
              <input
                id="submit-name"
                type="text"
                required
                minLength={3}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Pakistan Full-Stack Developers Community"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#16A34A]"
              />
            </div>

            <div>
              <label
                htmlFor="submit-description"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Description (Topics, Rules &amp; Audience)
              </label>
              <textarea
                id="submit-description"
                rows={3}
                maxLength={800}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what members will learn or discuss in this community..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#16A34A]"
              />
            </div>

            <div>
              <label
                htmlFor="submit-avatar-upload"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
              >
                Profile Picture (Auto-fetched from WhatsApp or Upload Custom · Max 2.5 MB)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {imageUrl && (
                  <div className="flex items-center gap-2.5 pr-2">
                    <img
                      src={imageUrl}
                      alt="Community profile picture"
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-emerald-500/40 shadow-xs shrink-0"
                    />
                    <span className="text-xs font-medium text-[#16A34A] dark:text-emerald-400">
                      Profile image ready
                    </span>
                  </div>
                )}
                <label
                  htmlFor="submit-avatar-upload"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-[#16A34A] cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingImage
                      ? 'Uploading...'
                      : imageUrl
                      ? 'Change Profile Image'
                      : 'Upload Profile Image'}
                  </span>
                </label>
                <input
                  id="submit-avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="sr-only"
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-xs text-slate-500 hover:text-red-600 cursor-pointer"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          <AdPlacement slot="submit" ads={settings.ads} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-5 rounded-xl text-sm font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors cursor-pointer"
          >
            {submitting
              ? 'Publishing to WT-LINKS...'
              : `Publish WhatsApp ${type === 'group' ? 'Group' : 'Channel'}`}
          </button>
        </form>

        {/* Live Preview Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Live Directory Card Preview
            </h2>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-5">
              <div className="flex items-start gap-3.5">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview avatar"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl shrink-0 bg-[#DCFCE7] dark:bg-emerald-950 text-[#15803D] dark:text-emerald-300 font-semibold text-sm flex items-center justify-center">
                    {(name.replace(/[^A-Za-z0-9]/g, '') || 'WA').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {type === 'group' ? 'Group' : 'Channel'}
                    </span>
                    <span>·</span>
                    <span>{selectedCategoryObj?.name || 'Category'}</span>
                    {followerHint && (
                      <>
                        <span>·</span>
                        <span className="text-[#16A34A] dark:text-emerald-400 font-medium">
                          {followerHint}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {name.trim() || `Your WhatsApp ${type === 'group' ? 'Group' : 'Channel'} Name`}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-line">
                {description.trim() ||
                  'Your community description and rules will appear here once entered.'}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono-tabular">0 clicks</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#16A34A]">
                  {type === 'group' ? 'View Group' : 'View Channel'}
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                WT-LINKS Submission Guidelines
              </div>
              <p>1. Only valid official WhatsApp group and channel links are accepted.</p>
              <p>2. Standard community links are published immediately after validation.</p>
              <p>
                3. Want top homepage placement? After publishing, click{' '}
                <strong>Promote This Group</strong> on your listing page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
