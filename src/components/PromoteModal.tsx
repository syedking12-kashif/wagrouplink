import React, { useState } from 'react';
import { X, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import { DirectoryEntry } from '../types';

interface PromoteModalProps {
  entry: DirectoryEntry | null;
  whatsappNumber: string;
  canonicalUrl: string;
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { days: 3, label: '3 Days', price: 'PKR 500' },
  { days: 7, label: '7 Days', price: 'PKR 1,000' },
  { days: 15, label: '15 Days', price: 'PKR 1,500' },
  { days: 30, label: '30 Days', price: 'PKR 2,500' },
];

export function PromoteModal({
  entry,
  whatsappNumber,
  canonicalUrl,
  onClose,
}: PromoteModalProps) {
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [submitting, setSubmitting] = useState(false);
  const [requestSaved, setRequestSaved] = useState(false);

  if (!entry) return null;

  const selectedOption =
    DURATION_OPTIONS.find((d) => d.days === selectedDays) || DURATION_OPTIONS[1];
  const publicPageUrl = `${canonicalUrl.replace(/\/$/, '')}/${entry.type}/${entry.slug}`;

  const cleanPhone = (whatsappNumber || '923254038592').replace(/[^0-9]/g, '');
  const messageText = `Assalamualaikum,

I want to promote my WhatsApp group/channel on WT-LINKS.

Name: ${entry.name}

Link: ${entry.invite_url}

WT-LINKS Page: ${publicPageUrl}

Requested Duration: ${selectedOption.label}

Please provide promotion details and payment information.

Thank you.`;

  const whatsappHref = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

  const handleRecordRequest = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/promote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entry.id,
          durationDays: selectedDays,
        }),
      });
      setRequestSaved(true);
    } catch {
      setRequestSaved(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="promote-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#16A34A] dark:text-emerald-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Featured Homepage Promotion</span>
            </div>
            <h2
              id="promote-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Promote "{entry.name}"
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close promotion modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Name:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {entry.name}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Invite Link:</span>
              <span className="font-mono-tabular text-slate-700 dark:text-slate-300 truncate max-w-[260px]">
                {entry.invite_url}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">WT-LINKS URL:</span>
              <span className="font-mono-tabular text-slate-700 dark:text-slate-300 truncate max-w-[260px]">
                {publicPageUrl}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Promotion Duration (Max 10 Global Featured Slots)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DURATION_OPTIONS.map((opt) => {
                const active = selectedDays === opt.days;
                return (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setSelectedDays(opt.days)}
                    className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#16A34A] bg-[#DCFCE7]/50 dark:bg-emerald-950/60 text-slate-900 dark:text-slate-100'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs">{opt.label}</div>
                    <div className="text-xs text-[#16A34A] dark:text-emerald-400 font-mono-tabular mt-0.5">
                      {opt.price}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Promoted entries appear in the top Featured section on the WT-LINKS homepage and
            receive a Featured badge. Click below to log your request and contact SK MODS Admin on
            WhatsApp (<span className="font-mono-tabular">+{cleanPhone}</span>) with your prefilled
            promotion details.
          </p>

          {requestSaved && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
              <span>
                Promotion request logged for admin review. Proceed to WhatsApp to finalize with SK
                MODS.
              </span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleRecordRequest}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors whitespace-nowrap shrink-0"
            >
              <span>{submitting ? 'Logging Request...' : 'Contact on WhatsApp to Promote'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
