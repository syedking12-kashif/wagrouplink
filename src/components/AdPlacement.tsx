import React from 'react';
import { AdSettings } from '../types';

interface AdPlacementProps {
  slot: 'homepage' | 'category' | 'detail' | 'submit' | 'blog';
  ads?: AdSettings;
}

export function AdPlacement({ slot, ads }: AdPlacementProps) {
  if (!ads || !ads.enabled_globally) return null;

  const slotConfig: Record<
    AdPlacementProps['slot'],
    { enabled: boolean; code: string; label: string }
  > = {
    homepage: {
      enabled: ads.homepage_ad_enabled,
      code: ads.homepage_ad_code,
      label: 'Homepage Sponsor Slot',
    },
    category: {
      enabled: ads.category_ad_enabled,
      code: ads.category_ad_code,
      label: 'Category Sponsor Slot',
    },
    detail: {
      enabled: ads.detail_ad_enabled,
      code: ads.detail_ad_code,
      label: 'Community Detail Sponsor Slot',
    },
    submit: {
      enabled: ads.submit_ad_enabled,
      code: ads.submit_ad_code,
      label: 'Submission Sponsor Slot',
    },
    blog: {
      enabled: ads.blog_ad_enabled,
      code: ads.blog_ad_code,
      label: 'Article Sponsor Slot',
    },
  };

  const current = slotConfig[slot];
  if (!current.enabled) return null;

  // Only render when actual Addsterra publisher code or publisher ID is configured by the owner
  const hasPublisherConfig = Boolean(current.code?.trim() || ads.publisher_id?.trim());
  if (!hasPublisherConfig) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored Advertisement"
      className="my-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center"
    >
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
        Sponsored · Addsterra Publisher #{ads.publisher_id || 'Configured'}
      </p>
      <div className="min-h-[64px] flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
        {current.label}
      </div>
    </aside>
  );
}
