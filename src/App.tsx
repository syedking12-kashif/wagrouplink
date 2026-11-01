import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Category,
  DirectoryEntry,
  BlogPost,
  SiteSettings,
} from './types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ENTRIES,
  DEFAULT_BLOG_POSTS,
  DEFAULT_SITE_SETTINGS,
} from './data/seedData';
import { WtLinksLogo, CategoryIcon } from './components/IconDynamic';
import { EntryCard } from './components/EntryCard';
import { PromoteModal } from './components/PromoteModal';
import { SubmitView } from './components/SubmitView';
import { DetailView } from './components/DetailView';
import {
  BlogListView,
  BlogDetailView,
  StaticContentPage,
  Custom404View,
} from './components/StaticPages';
import { AdminDashboard } from './components/AdminDashboard';
import { SeoHead } from './components/SeoHead';
import { AdPlacement } from './components/AdPlacement';

export default function App() {
  // Theme state (persisted in localStorage, respects system preference on first visit)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wt_links_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('wt_links_theme', darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [darkMode]);

  // URL Routing State
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data State (pre-populated with deterministic seed data & hydrated from server.ts)
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [entries, setEntries] = useState<DirectoryEntry[]>(DEFAULT_ENTRIES);
  const [blogs, setBlogs] = useState<BlogPost[]>(DEFAULT_BLOG_POSTS);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  // Directory Search, Filter, Sort & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'group' | 'channel'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'alphabetical' | 'featured'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // Promote Modal State
  const [promoteTarget, setPromoteTarget] = useState<DirectoryEntry | null>(null);

  const fetchBootstrapData = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.entries)) setEntries(data.entries);
      if (Array.isArray(data.blogs)) setBlogs(data.blogs);
      if (data.settings) setSettings(data.settings);
    } catch {
      // Fallback to initial seed state if offline
    }
  }, []);

  useEffect(() => {
    fetchBootstrapData();
  }, [fetchBootstrapData]);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname || '/');
      setMobileMenuOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    const cleanPath = to.startsWith('/') ? to : `/${to}`;
    window.history.pushState({}, '', cleanPath);
    setPathname(cleanPath);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Enrich entries with category names if not already enriched
  const enrichedEntries = useMemo(() => {
    const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
    return entries
      .filter((e) => e.status === 'published')
      .map((e) => {
        const cat = catMap.get(e.category_id);
        return {
          ...e,
          category_name: e.category_name || cat?.name || 'Community',
          category_slug: e.category_slug || cat?.slug || 'other',
        };
      });
  }, [entries, categories]);

  const enrichedCategories = useMemo(() => {
    return categories
      .filter((c) => c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => {
        const catEntries = enrichedEntries.filter((e) => e.category_id === c.id);
        return {
          ...c,
          group_count: catEntries.filter((e) => e.type === 'group').length,
          channel_count: catEntries.filter((e) => e.type === 'channel').length,
        };
      });
  }, [categories, enrichedEntries]);

  const featuredEntries = useMemo(() => {
    return enrichedEntries
      .filter((e) => e.is_featured)
      .sort((a, b) => (a.promotion_order || 999) - (b.promotion_order || 999))
      .slice(0, 10);
  }, [enrichedEntries]);

  const recentEntries = useMemo(() => {
    return [...enrichedEntries]
      .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
      .slice(0, 6);
  }, [enrichedEntries]);

  const popularEntries = useMemo(() => {
    return [...enrichedEntries]
      .sort((a, b) => b.total_clicks - a.total_clicks)
      .slice(0, 6);
  }, [enrichedEntries]);

  const handleClickRecorded = (entryId: string, newTotal: number) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, total_clicks: newTotal } : e))
    );
  };

  // Sync directory filters when route changes
  useEffect(() => {
    setCurrentPage(1);
    if (pathname === '/groups') {
      setTypeFilter('group');
      setCategoryFilter('all');
      setSortBy('newest');
    } else if (pathname === '/channels') {
      setTypeFilter('channel');
      setCategoryFilter('all');
      setSortBy('newest');
    } else if (pathname === '/featured') {
      setTypeFilter('all');
      setCategoryFilter('all');
      setSortBy('featured');
    } else if (pathname === '/recent') {
      setTypeFilter('all');
      setCategoryFilter('all');
      setSortBy('newest');
    } else if (pathname === '/popular') {
      setTypeFilter('all');
      setCategoryFilter('all');
      setSortBy('popular');
    } else if (pathname.startsWith('/category/')) {
      const slug = pathname.replace('/category/', '').split('/')[0];
      setTypeFilter('all');
      setCategoryFilter(slug);
      setSortBy('newest');
    }
  }, [pathname]);

  // Directory Listing View Renderer (/groups, /channels, /category/[slug], /featured, /recent, /popular)
  const renderDirectoryCatalog = (config: {
    heading: string;
    subheading: string;
    lockedType?: 'group' | 'channel';
    lockedCategorySlug?: string;
    featuredOnly?: boolean;
  }) => {
    const activeType = config.lockedType || typeFilter;
    const activeCatSlug = config.lockedCategorySlug || categoryFilter;

    let filtered = enrichedEntries.filter((e) => {
      if (config.featuredOnly && !e.is_featured) return false;
      if (activeType !== 'all' && e.type !== activeType) return false;
      if (
        activeCatSlug !== 'all' &&
        e.category_slug !== activeCatSlug &&
        e.category_id !== activeCatSlug
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.category_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === 'popular') {
      filtered = [...filtered].sort((a, b) => b.total_clicks - a.total_clicks);
    } else if (sortBy === 'alphabetical') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'featured') {
      filtered = [...filtered].sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return (a.promotion_order || 999) - (b.promotion_order || 999);
      });
    } else {
      filtered = [...filtered].sort(
        (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)
      );
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = filtered.slice(
      (safePage - 1) * ITEMS_PER_PAGE,
      safePage * ITEMS_PER_PAGE
    );

    return (
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
        <div className="mb-8">
          <div className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400 mb-1">
            WT-LINKS Directory · {filtered.length} Verified Listings
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {config.heading}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {config.subheading}
          </p>
        </div>

        {/* Search, Type, Category & Sort Toolbar */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search group name, channel, topic, or category..."
              aria-label="Search WhatsApp communities"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#16A34A]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!config.lockedType && (
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                {(['all', 'group', 'channel'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTypeFilter(t);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      typeFilter === t
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : t === 'group' ? 'Groups' : 'Channels'}
                  </button>
                ))}
              </div>
            )}

            {!config.lockedCategorySlug && (
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by category"
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium"
              >
                <option value="all">All Categories</option>
                {enrichedCategories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(
                  e.target.value as 'newest' | 'popular' | 'alphabetical' | 'featured'
                );
                setCurrentPage(1);
              }}
              aria-label="Sort directory entries"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium"
            >
              <option value="newest">Sort: Newest</option>
              <option value="popular">Sort: Most Popular</option>
              <option value="featured">Sort: Featured First</option>
              <option value="alphabetical">Sort: Alphabetical (A–Z)</option>
            </select>
          </div>
        </div>

        <AdPlacement slot="category" ads={settings.ads} />

        {paginated.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No Matching Communities Found
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Try clearing your search filters or be the first to submit a WhatsApp link in this
              category.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setCategoryFilter('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => navigate('/submit')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#16A34A] text-white cursor-pointer"
              >
                Submit Your Link
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onNavigate={navigate}
                  onPromoteClick={setPromoteTarget}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5 text-xs">
                <span className="text-slate-500 font-mono-tabular">
                  Page {safePage} of {totalPages} ({filtered.length} entries)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Resolve current route view & SEO metadata
  const renderMainRoute = () => {
    // 1. Private Admin Route (/sk or /SK)
    const lowerPath = pathname.toLowerCase();
    if (lowerPath === '/sk' || lowerPath.startsWith('/sk/')) {
      return (
        <>
          <SeoHead
            title="Admin Console (/sk) — WT-LINKS"
            description="Private administration portal for WT-LINKS by SK MODS."
            canonicalPath="/sk"
            noindex={true}
          />
          <AdminDashboard onPublicDataChanged={fetchBootstrapData} onNavigate={navigate} />
        </>
      );
    }

    // 2. Homepage (/)
    if (pathname === '/') {
      return (
        <>
          <SeoHead
            title={settings.default_seo_title}
            description={settings.default_seo_description}
            canonicalPath="/"
            jsonLd={{
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'WT-LINKS',
              alternateName: 'SK MODS WhatsApp Directory',
              url: 'https://wagrouplinks.vercel.app',
              author: {
                '@type': 'Person',
                name: 'Syed Kashif',
              },
            }}
          />

          {/* Hero Section */}
          <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-6xl mx-auto py-12 sm:py-16 px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400">
                  Powered by SK MODS · Curated WhatsApp Directory
                </div>
                <h1
                  className="font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.12]"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', textWrap: 'balance' }}
                >
                  Discover Your Community on WhatsApp
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                  Explore thousands of WhatsApp groups and channels across education, entertainment,
                  jobs, friendship, technology, and more.
                </p>

                {/* Immediate Hero Search Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate('/groups');
                  }}
                  className="flex flex-col sm:flex-row gap-2.5 max-w-xl pt-1"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search study groups, IT jobs, Islamic reminders..."
                      aria-label="Search WhatsApp groups and channels"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Search Directory
                  </button>
                </form>

                {/* Hero Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/groups')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Browse Groups
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/channels')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#16A34A] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Browse Channels
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/submit')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#16A34A] dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Submit Your Link</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 aspect-video relative">
                  <img
                    src="/src/assets/images/hero_community_network_1793511060718.jpg"
                    alt="WT-LINKS WhatsApp community discovery workspace"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-5 text-white">
                    <div className="text-xs font-medium text-emerald-300">
                      Verified Directory · 20+ Categories
                    </div>
                    <div className="text-sm font-semibold mt-0.5">
                      Instant link submission &amp; live click analytics
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 space-y-14">
            <AdPlacement slot="homepage" ads={settings.ads} />

            {/* Featured & Promoted Section (Max 10 Globally) */}
            {featuredEntries.length > 0 && (
              <section>
                <div className="flex items-end justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] dark:text-emerald-400 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Featured &amp; Promoted Communities</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      Featured Groups &amp; Channels
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/featured')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    <span>View All Featured ({featuredEntries.length}/10)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredEntries.slice(0, 6).map((entry) => (
                    <EntryCard key={entry.id} entry={entry} onNavigate={navigate} />
                  ))}
                </div>
              </section>
            )}

            {/* Category Section (20 Default Categories) */}
            <section>
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Browse by Interest
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Explore Categories
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/categories')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] hover:underline cursor-pointer whitespace-nowrap"
                >
                  <span>All {enrichedCategories.length} Categories</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {enrichedCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => navigate(`/category/${cat.slug}`)}
                    className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-[#16A34A] transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#DCFCE7] dark:bg-emerald-950/80 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center mb-3">
                      <CategoryIcon name={cat.icon} className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#16A34A] truncate">
                      {cat.name}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                      {cat.group_count || 0} groups · {cat.channel_count || 0} channels
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Recently Added */}
            <section>
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Fresh Submissions
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Recently Added Communities
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/recent')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] hover:underline cursor-pointer whitespace-nowrap"
                >
                  <span>View All Recent</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} onNavigate={navigate} />
                ))}
              </div>
            </section>

            {/* Most Popular */}
            <section>
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Ranked by Verified Clicks
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Most Popular Groups &amp; Channels
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/popular')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] hover:underline cursor-pointer whitespace-nowrap"
                >
                  <span>View Popular Leaderboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} onNavigate={navigate} />
                ))}
              </div>
            </section>

            {/* Latest Blog Articles */}
            <section>
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Guides &amp; Insights
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Latest from the WT-LINKS Blog
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/blog')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] hover:underline cursor-pointer whitespace-nowrap"
                >
                  <span>Read All Articles</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {blogs.slice(0, 3).map((post) => (
                  <article
                    key={post.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-5">
                        <div className="text-xs text-[#16A34A] font-medium mb-1">
                          {post.category}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                          <a
                            href={`/blog/${post.slug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/blog/${post.slug}`);
                            }}
                            className="hover:text-[#16A34A] transition-colors"
                          >
                            {post.title}
                          </a>
                        </h3>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {post.excerpt}
                        </p>
                      </div>
                    </div>
                    <div className="px-5 pb-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/blog/${post.slug}`)}
                        className="text-xs font-semibold text-[#16A34A] hover:underline cursor-pointer"
                      >
                        Read Guide →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </>
      );
    }

    // 3. All Groups (/groups)
    if (pathname === '/groups') {
      return (
        <>
          <SeoHead
            title="All WhatsApp Groups Directory — WT-LINKS"
            description="Browse and join active, verified WhatsApp groups across education, jobs, programming, Islamic reminders, and more on WT-LINKS."
            canonicalPath="/groups"
          />
          {renderDirectoryCatalog({
            heading: 'All WhatsApp Groups',
            subheading:
              'Browse active WhatsApp community groups across 20+ categories. Filter by interest or search keywords.',
            lockedType: 'group',
          })}
        </>
      );
    }

    // 4. All Channels (/channels)
    if (pathname === '/channels') {
      return (
        <>
          <SeoHead
            title="All WhatsApp Channels Directory — WT-LINKS"
            description="Follow verified WhatsApp broadcast channels for breaking news, exam prep, cricket updates, and daily reminders on WT-LINKS."
            canonicalPath="/channels"
          />
          {renderDirectoryCatalog({
            heading: 'All WhatsApp Channels',
            subheading:
              'Discover official broadcast channels on WhatsApp for daily updates, study notes, and curated announcements.',
            lockedType: 'channel',
          })}
        </>
      );
    }

    // 5. All Categories (/categories)
    if (pathname === '/categories') {
      return (
        <>
          <SeoHead
            title="Browse All 20+ WhatsApp Group & Channel Categories — WT-LINKS"
            description="Explore WhatsApp groups and channels organized by category: Islamic, Education, Jobs, Technology, Freelancing, Programming, Sports, and more."
            canonicalPath="/categories"
          />
          <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
            <div className="mb-8">
              <div className="text-xs font-semibold text-[#16A34A] mb-1">
                Complete Topic Index
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                All WhatsApp Categories ({enrichedCategories.length})
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Select any category below to browse verified WhatsApp groups and channels.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {enrichedCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/category/${cat.slug}`)}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-[#16A34A] transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950 text-[#16A34A] flex items-center justify-center mb-3.5">
                      <CategoryIcon name={cat.icon} className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {cat.name}
                    </h2>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-mono-tabular text-slate-500 flex items-center justify-between">
                    <span>
                      {cat.group_count || 0} groups · {cat.channel_count || 0} channels
                    </span>
                    <span className="text-[#16A34A] font-sans font-semibold">Explore →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    // 6. Category Specific Directory (/category/[slug])
    if (pathname.startsWith('/category/')) {
      const slug = pathname.replace('/category/', '').split('/')[0];
      const cat = enrichedCategories.find((c) => c.slug === slug);
      if (!cat) {
        return (
          <Custom404View
            categories={enrichedCategories}
            onNavigate={navigate}
            onSearchSubmit={(q) => {
              setSearchQuery(q);
              navigate('/groups');
            }}
          />
        );
      }
      return (
        <>
          <SeoHead
            title={cat.seo_title || `${cat.name} WhatsApp Groups & Channels — WT-LINKS`}
            description={cat.seo_description || cat.description}
            canonicalPath={`/category/${cat.slug}`}
          />
          {renderDirectoryCatalog({
            heading: `${cat.name} WhatsApp Groups & Channels`,
            subheading: cat.description,
            lockedCategorySlug: cat.slug,
          })}
        </>
      );
    }

    // 7. Featured (/featured)
    if (pathname === '/featured') {
      return (
        <>
          <SeoHead
            title="Featured & Promoted WhatsApp Groups and Channels — WT-LINKS"
            description="Explore top promoted and verified WhatsApp groups and channels on WT-LINKS."
            canonicalPath="/featured"
          />
          {renderDirectoryCatalog({
            heading: 'Featured & Promoted Communities',
            subheading:
              'Premium community listings verified and promoted by SK MODS (limited to 10 active slots globally).',
            featuredOnly: true,
          })}
        </>
      );
    }

    // 8. Recent (/recent)
    if (pathname === '/recent') {
      return (
        <>
          <SeoHead
            title="Recently Added WhatsApp Groups & Channels — WT-LINKS"
            description="Join the newest WhatsApp groups and channels submitted to WT-LINKS."
            canonicalPath="/recent"
          />
          {renderDirectoryCatalog({
            heading: 'Recently Added Groups & Channels',
            subheading: 'The latest community links published to the WT-LINKS directory.',
          })}
        </>
      );
    }

    // 9. Popular (/popular)
    if (pathname === '/popular') {
      return (
        <>
          <SeoHead
            title="Most Popular WhatsApp Groups & Channels — WT-LINKS"
            description="Discover the most popular WhatsApp groups and channels ranked by verified community clicks."
            canonicalPath="/popular"
          />
          {renderDirectoryCatalog({
            heading: 'Most Popular WhatsApp Communities',
            subheading: 'Top WhatsApp groups and channels ranked by legitimate member clicks.',
          })}
        </>
      );
    }

    // 10. Submit Page (/submit)
    if (pathname === '/submit') {
      return (
        <>
          <SeoHead
            title="Submit a WhatsApp Group or Channel — WT-LINKS"
            description="Submit your WhatsApp group or channel invite link to WT-LINKS for free instant discovery."
            canonicalPath="/submit"
          />
          <SubmitView
            categories={enrichedCategories}
            settings={settings}
            onSubmitted={(newEntry) => {
              setEntries((prev) => [newEntry, ...prev]);
            }}
            onNavigate={navigate}
          />
        </>
      );
    }

    // 11. Group or Channel Detail Page (/group/[slug] or /channel/[slug])
    if (pathname.startsWith('/group/') || pathname.startsWith('/channel/')) {
      const parts = pathname.split('/').filter(Boolean);
      const slug = parts[1] || '';
      const entry = enrichedEntries.find((e) => e.slug === slug);
      if (!entry) {
        return (
          <Custom404View
            categories={enrichedCategories}
            onNavigate={navigate}
            onSearchSubmit={(q) => {
              setSearchQuery(q);
              navigate('/groups');
            }}
          />
        );
      }
      const related = enrichedEntries
        .filter((e) => e.category_id === entry.category_id && e.id !== entry.id)
        .slice(0, 6);

      return (
        <>
          <SeoHead
            title={`${entry.name} — Join WhatsApp ${
              entry.type === 'group' ? 'Group' : 'Channel'
            } on WT-LINKS`}
            description={entry.description}
            canonicalPath={`/${entry.type}/${entry.slug}`}
            jsonLd={{
              '@context': 'https://schema.org',
              '@type': 'SocialMediaPosting',
              headline: entry.name,
              description: entry.description,
              datePublished: entry.published_at,
              url: `https://wagrouplinks.vercel.app/${entry.type}/${entry.slug}`,
            }}
          />
          <DetailView
            entry={entry}
            related={related}
            settings={settings}
            onNavigate={navigate}
            onOpenPromote={setPromoteTarget}
            onClickRecorded={handleClickRecorded}
          />
        </>
      );
    }

    // 12. Blog Listing & Blog Detail (/blog & /blog/[slug])
    if (pathname === '/blog') {
      return (
        <>
          <SeoHead
            title="WhatsApp Community Blog & Guides — WT-LINKS"
            description="Read practical tutorials and safety guides on finding study groups, remote jobs, and growing WhatsApp channels."
            canonicalPath="/blog"
          />
          <BlogListView
            posts={blogs.filter((b) => b.status === 'published')}
            settings={settings}
            onNavigate={navigate}
          />
        </>
      );
    }

    if (pathname.startsWith('/blog/')) {
      const slug = pathname.replace('/blog/', '').split('/')[0];
      const post = blogs.find((b) => b.slug === slug && b.status === 'published');
      if (!post) {
        return (
          <Custom404View
            categories={enrichedCategories}
            onNavigate={navigate}
            onSearchSubmit={(q) => {
              setSearchQuery(q);
              navigate('/groups');
            }}
          />
        );
      }
      const related = blogs.filter((b) => b.status === 'published' && b.id !== post.id).slice(0, 3);
      return (
        <>
          <SeoHead
            title={post.seo_title || `${post.title} — WT-LINKS Blog`}
            description={post.seo_description || post.excerpt}
            canonicalPath={`/blog/${post.slug}`}
            ogType="article"
            ogImage={post.featured_image}
          />
          <BlogDetailView
            post={post}
            related={related}
            settings={settings}
            onNavigate={navigate}
          />
        </>
      );
    }

    // 13. Static Legal, About, Contact & Report Pages
    if (
      pathname === '/about' ||
      pathname === '/contact' ||
      pathname === '/terms' ||
      pathname === '/privacy-policy' ||
      pathname === '/disclaimer' ||
      pathname === '/report'
    ) {
      const pageKey = pathname.slice(1) as
        | 'about'
        | 'contact'
        | 'terms'
        | 'privacy-policy'
        | 'disclaimer'
        | 'report';
      return (
        <>
          <SeoHead
            title={`${pageKey.replace('-', ' ').toUpperCase()} — WT-LINKS by SK MODS`}
            description={settings.default_seo_description}
            canonicalPath={pathname}
          />
          <StaticContentPage
            page={pageKey}
            settings={settings}
            entries={enrichedEntries}
            onNavigate={navigate}
          />
        </>
      );
    }

    // 14. Custom 404 Not Found Page (/404 or any unmatched path)
    return (
      <>
        <SeoHead
          title="404 Page Not Found — WT-LINKS"
          description="The requested page could not be found on WT-LINKS."
          canonicalPath="/404"
          noindex={true}
        />
        <Custom404View
          categories={enrichedCategories}
          onNavigate={navigate}
          onSearchSubmit={(q) => {
            setSearchQuery(q);
            navigate('/groups');
          }}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100">
      {/* Top Bar Contract: Zone 1 Brand Wordmark | Zone 2 Nav Links | Zone 3 Primary Action */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <WtLinksLogo className="w-7 h-7" />
            <span>WT-LINKS</span>
          </a>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            {[
              { label: 'Groups', path: '/groups' },
              { label: 'Channels', path: '/channels' },
              { label: 'Categories', path: '/categories' },
              { label: 'Featured', path: '/featured' },
              { label: 'Blog', path: '/blog' },
            ].map((item) => {
              const active = pathname === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                  className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#16A34A] dark:hover:text-emerald-400 ${
                    active
                      ? 'text-[#16A34A] dark:text-emerald-400 font-semibold underline underline-offset-8'
                      : ''
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Theme Toggle + Primary Submit Link CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#16A34A] transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => navigate('/submit')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Submit Link
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
            {[
              { label: 'Home', path: '/' },
              { label: 'Groups', path: '/groups' },
              { label: 'Channels', path: '/channels' },
              { label: 'Categories', path: '/categories' },
              { label: 'Featured', path: '/featured' },
              { label: 'Recent', path: '/recent' },
              { label: 'Popular', path: '/popular' },
              { label: 'Blog', path: '/blog' },
              { label: 'Submit Link', path: '/submit' },
            ].map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{renderMainRoute()}</main>

      {/* Quiet Footer with SK MODS Branding & Legal Links */}
      <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-slate-100">
                <WtLinksLogo className="w-6 h-6" />
                <span>WT-LINKS</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Discover, submit, share, and promote verified WhatsApp Groups and Channels across
                20+ community categories.
              </p>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Powered by <strong>{settings.brand_owner}</strong> · Developed by{' '}
                <strong>{settings.developer_name}</strong>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Directory
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                {[
                  { label: 'Browse Groups', path: '/groups' },
                  { label: 'Browse Channels', path: '/channels' },
                  { label: 'All Categories', path: '/categories' },
                  { label: 'Featured Links', path: '/featured' },
                  { label: 'Recently Added', path: '/recent' },
                  { label: 'Most Popular', path: '/popular' },
                ].map((l) => (
                  <li key={l.path}>
                    <a
                      href={l.path}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(l.path);
                      }}
                      className="hover:text-[#16A34A]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Community &amp; Legal
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                {[
                  { label: 'Submit Link', path: '/submit' },
                  { label: 'Blog & Guides', path: '/blog' },
                  { label: 'About WT-LINKS', path: '/about' },
                  { label: 'Contact Us', path: '/contact' },
                  { label: 'Report Content', path: '/report' },
                  { label: 'Terms & Conditions', path: '/terms' },
                  { label: 'Privacy Policy', path: '/privacy-policy' },
                  { label: 'Disclaimer', path: '/disclaimer' },
                ].map((l) => (
                  <li key={l.path}>
                    <a
                      href={l.path}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(l.path);
                      }}
                      className="hover:text-[#16A34A]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Official Contact (SK MODS)
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  WhatsApp:{' '}
                  <a
                    href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono-tabular text-[#16A34A] hover:underline"
                  >
                    +{settings.whatsapp_number}
                  </a>
                </li>
                <li>
                  Email:{' '}
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="hover:text-[#16A34A] break-all"
                  >
                    {settings.contact_email}
                  </a>
                </li>
                <li>
                  Instagram:{' '}
                  <a
                    href="https://instagram.com/Syed_pro_dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#16A34A]"
                  >
                    {settings.instagram_handle}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} WT-LINKS · Powered by SK MODS · Developed by Syed Kashif.
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#16A34A]"
              >
                Sitemap
              </a>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#16A34A]"
              >
                Robots.txt
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Promote Modal */}
      <PromoteModal
        entry={promoteTarget}
        whatsappNumber={settings.whatsapp_number}
        canonicalUrl={settings.canonical_url}
        onClose={() => setPromoteTarget(null)}
      />
    </div>
  );
}
