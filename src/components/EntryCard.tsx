import React, { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Sparkles } from 'lucide-react';
import { DirectoryEntry } from '../types';

interface EntryCardProps {
  entry: DirectoryEntry;
  onNavigate: (path: string) => void;
  onPromoteClick?: (entry: DirectoryEntry) => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry, onNavigate }) => {
  const [imgError, setImgError] = useState(false);
  const detailPath = `/${entry.type}/${entry.slug}`;

  const initials = entry.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-colors hover:border-[#16A34A]/60 dark:hover:border-[#16A34A]/60">
      <div>
        <div className="flex items-start gap-3.5">
          {entry.image_url && !imgError ? (
            <img
              src={entry.image_url}
              alt={`${entry.name} profile`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-xl shrink-0 bg-[#DCFCE7] dark:bg-emerald-950/70 text-[#15803D] dark:text-emerald-300 font-semibold text-sm flex items-center justify-center border border-emerald-200/70 dark:border-emerald-800/60"
            >
              {initials || 'WA'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Clean unboxed inline metadata per Zero-Pill Discipline */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {entry.type === 'group' ? 'Group' : 'Channel'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{entry.category_name || 'Community'}</span>
              {entry.is_featured && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#16A34A] dark:text-emerald-400">
                    <Sparkles className="w-3 h-3" />
                    Featured
                  </span>
                </>
              )}
              {entry.is_verified && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                    Verified
                  </span>
                </>
              )}
            </div>

            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate">
              <a
                href={detailPath}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(detailPath);
                }}
                className="hover:text-[#16A34A] dark:hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:underline"
              >
                {entry.name}
              </a>
            </h3>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {entry.description}
        </p>
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
          {entry.total_clicks.toLocaleString()} clicks
        </span>

        <button
          type="button"
          onClick={() => onNavigate(detailPath)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>{entry.type === 'group' ? 'View Group' : 'View Channel'}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
};
