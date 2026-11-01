import React, { useState } from 'react';
import {
  ExternalLink,
  Share2,
  Copy,
  Check,
  Flag,
  Sparkles,
  CheckCircle2,
  Calendar,
  MousePointerClick,
  ChevronRight,
} from 'lucide-react';
import { DirectoryEntry, SiteSettings } from '../types';
import { EntryCard } from './EntryCard';
import { AdPlacement } from './AdPlacement';
import { mirrorPublicSubmissionToFirestore } from '../lib/firebase';

interface DetailViewProps {
  entry: DirectoryEntry;
  related: DirectoryEntry[];
  settings: SiteSettings;
  onNavigate: (path: string) => void;
  onOpenPromote: (entry: DirectoryEntry) => void;
  onClickRecorded: (entryId: string, newTotal: number) => void;
}

const REPORT_REASONS = [
  'Spam',
  'Scam',
  'Inappropriate content',
  'Broken invite link',
  'Wrong category',
  'Misleading information',
  'Other',
] as const;

export function DetailView({
  entry,
  related,
  settings,
  onNavigate,
  onOpenPromote,
  onClickRecorded,
}: DetailViewProps) {
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>('Broken invite link');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const canonicalBase = (settings.canonical_url || 'https://wagrouplinks.vercel.app').replace(
    /\/$/,
    ''
  );
  const publicPageUrl = `${canonicalBase}/${entry.type}/${entry.slug}`;
  const shareMessage = `Discover this WhatsApp ${entry.type} on WT-LINKS: ${entry.name} (${
    entry.category_name || 'Community'
  }) — ${publicPageUrl}`;

  const handleJoinClick = async () => {
    setJoining(true);
    try {
      const res = await fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entry.id,
          eventType: entry.is_featured ? 'promotion_click' : 'join_click',
        }),
      });
      const data = await res.json();
      if (typeof data.total_clicks === 'number') {
        onClickRecorded(entry.id, data.total_clicks);
      }
    } catch {
      // Proceed to WhatsApp invite link regardless
    } finally {
      setJoining(false);
      window.location.assign(entry.invite_url);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${entry.name} — WT-LINKS`,
          text: `Discover this WhatsApp ${entry.type} on WT-LINKS: ${entry.name}`,
          url: publicPageUrl,
        });
      } catch {
        // User cancelled share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitting(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entry.id,
          reason: reportReason,
          description: reportDesc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.report) {
        mirrorPublicSubmissionToFirestore('reports', data.report.id, data.report);
      }
      setReportSubmitted(true);
    } catch {
      setReportSubmitted(true);
    } finally {
      setReportSubmitting(false);
    }
  };

  const initials = entry.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-6"
      >
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="hover:text-slate-900 dark:hover:text-slate-100"
        >
          Home
        </a>
        <ChevronRight className="w-3.5 h-3.5" />
        <a
          href={entry.type === 'group' ? '/groups' : '/channels'}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(entry.type === 'group' ? '/groups' : '/channels');
          }}
          className="hover:text-slate-900 dark:hover:text-slate-100"
        >
          {entry.type === 'group' ? 'Groups' : 'Channels'}
        </a>
        <ChevronRight className="w-3.5 h-3.5" />
        <a
          href={`/category/${entry.category_slug || 'other'}`}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(`/category/${entry.category_slug || 'other'}`);
          }}
          className="hover:text-slate-900 dark:hover:text-slate-100"
        >
          {entry.category_name || 'Category'}
        </a>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 dark:text-slate-200 font-medium truncate max-w-[220px]">
          {entry.name}
        </span>
      </nav>

      {/* Main Detail Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {entry.image_url ? (
              <img
                src={entry.image_url}
                alt={entry.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0 bg-[#DCFCE7] dark:bg-emerald-950 text-[#15803D] dark:text-emerald-300 font-bold text-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                {initials || 'WA'}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  WhatsApp {entry.type === 'group' ? 'Group' : 'Channel'}
                </span>
                <span>·</span>
                <a
                  href={`/category/${entry.category_slug || 'other'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(`/category/${entry.category_slug || 'other'}`);
                  }}
                  className="text-[#16A34A] dark:text-emerald-400 font-medium hover:underline"
                >
                  {entry.category_name}
                </a>
                {entry.is_featured && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#16A34A] dark:text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      Featured Promotion
                    </span>
                  </>
                )}
                {entry.is_verified && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      Verified
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {entry.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Published {new Date(entry.published_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono-tabular text-slate-700 dark:text-slate-300 font-medium">
                  <MousePointerClick className="w-3.5 h-3.5 text-[#16A34A]" />
                  {entry.total_clicks.toLocaleString()} total clicks
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
            <button
              type="button"
              disabled={joining}
              onClick={handleJoinClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>
                {joining
                  ? 'Opening WhatsApp...'
                  : entry.type === 'group'
                  ? 'Join WhatsApp Group'
                  : 'View WhatsApp Channel'}
              </span>
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onOpenPromote(entry)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#16A34A] hover:text-[#16A34A] dark:hover:text-emerald-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Promote This {entry.type === 'group' ? 'Group' : 'Channel'}</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            About This Community
          </h2>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {entry.description}
          </p>
        </div>

        {/* Share & Report Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Share2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Share on WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span>Share</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowReportModal(true);
              setReportSubmitted(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report Link</span>
          </button>
        </div>
      </div>

      <AdPlacement slot="detail" ads={settings.ads} />

      {/* Related Groups & Channels */}
      {related.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Related in {entry.category_name}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate(`/category/${entry.category_slug || 'other'}`)}
              className="text-xs font-semibold text-[#16A34A] hover:underline cursor-pointer"
            >
              View All {entry.category_name}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((rel) => (
              <EntryCard key={rel.id} entry={rel} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <h3
              id="report-modal-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              Report "{entry.name}"
            </h3>
            {reportSubmitted ? (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5">
                  Thank you. Your report has been submitted to SK MODS moderators for review.
                </p>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="report-reason"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Reason for Report
                  </label>
                  <select
                    id="report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="report-desc"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Additional Details (Optional)
                  </label>
                  <textarea
                    id="report-desc"
                    rows={3}
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Provide context to help moderators verify the issue..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
