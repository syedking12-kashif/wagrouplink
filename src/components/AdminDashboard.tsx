import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Search,
  Upload,
} from 'lucide-react';
import {
  Category,
  DirectoryEntry,
  Promotion,
  PromotionRequest,
  ReportItem,
  BlogPost,
  SiteSettings,
} from '../types';
import { WtLinksLogo } from './IconDynamic';

type AdminTab =
  | 'overview'
  | 'groups'
  | 'channels'
  | 'categories'
  | 'promotions'
  | 'promotion-requests'
  | 'reports'
  | 'blogs'
  | 'analytics'
  | 'ads'
  | 'website'
  | 'seo'
  | 'security';

interface AdminOverviewStats {
  totalGroups: number;
  totalChannels: number;
  totalCategories: number;
  totalClicks: number;
  dailyClicks: number;
  weeklyClicks: number;
  monthlyClicks: number;
  promotionClicks: number;
  uniqueVisitors: number;
  activePromotionsCount: number;
  pendingPromotionRequestsCount: number;
  pendingReportsCount: number;
  totalBlogPosts: number;
}

const ADMIN_TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'overview', label: '01. Overview' },
  { id: 'groups', label: '02. Groups' },
  { id: 'channels', label: '03. Channels' },
  { id: 'categories', label: '04. Categories' },
  { id: 'promotions', label: '05. Promotions' },
  { id: 'promotion-requests', label: '06. Promotion Requests' },
  { id: 'reports', label: '07. Reports' },
  { id: 'blogs', label: '08. Blog Posts' },
  { id: 'analytics', label: '09. Analytics' },
  { id: 'ads', label: '10. Advertisement Settings' },
  { id: 'website', label: '11. Website Settings' },
  { id: 'seo', label: '12. SEO Settings' },
  { id: 'security', label: '13. Security Settings' },
];

export function AdminDashboard({
  onPublicDataChanged,
  onNavigate,
}: {
  onPublicDataChanged: () => void;
  onNavigate: (path: string) => void;
}) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState('syedking12');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionRequests, setPromotionRequests] = useState<PromotionRequest[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  // Filters & Edit States
  const [entrySearch, setEntrySearch] = useState('');
  const [entryCategoryFilter, setEntryCategoryFilter] = useState('all');
  const [editingEntry, setEditingEntry] = useState<DirectoryEntry | null>(null);
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null);

  // Category Form State
  const [catForm, setCatForm] = useState({
    id: '',
    name: '',
    slug: '',
    description: '',
    icon: 'Folder',
    seo_title: '',
    seo_description: '',
    sort_order: 21,
    is_active: true,
  });

  // Manual Promotion Form State
  const [promoEntryId, setPromoEntryId] = useState('');
  const [promoDuration, setPromoDuration] = useState(7);
  const [promoPrice, setPromoPrice] = useState(1000);
  const [promoOrder, setPromoOrder] = useState(1);

  // Blog CMS Editor State
  const [blogForm, setBlogForm] = useState({
    id: '',
    title: '',
    slug: '',
    excerpt: '',
    content: '<h2>Introduction</h2><p>Write your community guide here...</p>',
    featured_image: '/src/assets/images/blog_study_groups_1793511059111.jpg',
    seo_title: '',
    seo_description: '',
    category: 'Community Guides',
    tags: 'WhatsApp, Community, Guide',
    status: 'published' as 'draft' | 'published',
  });
  const [inlineImgUrl, setInlineImgUrl] = useState('');
  const [inlineImgCaption, setInlineImgCaption] = useState('');
  const [inlineImgAlign, setInlineImgAlign] = useState<'center' | 'left' | 'right'>('center');

  // Security Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [generatedHash, setGeneratedHash] = useState('');
  const adminTokenRef = React.useRef<string>(
    (() => {
      try {
        return window.localStorage.getItem('wt_admin_token') || '';
      } catch {
        return '';
      }
    })()
  );

  const saveAdminToken = useCallback((token: string) => {
    adminTokenRef.current = token;
    try {
      if (token) {
        window.localStorage.setItem('wt_admin_token', token);
      } else {
        window.localStorage.removeItem('wt_admin_token');
      }
    } catch {
      // Ignore storage access errors in strict iframe contexts
    }
  }, []);

  const adminFetch = useCallback((url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});
    const token = adminTokenRef.current;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('X-Admin-Token', token);
    }
    return fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    });
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchAdminData = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/dashboard');
      if (res.status === 401) {
        saveAdminToken('');
        setAuthenticated(false);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setOverview(data.overview);
      setEntries(data.entries || []);
      setCategories(data.categories || []);
      setPromotions(data.promotions || []);
      setPromotionRequests(data.promotionRequests || []);
      setReports(data.reports || []);
      setBlogPosts(data.blogPosts || []);
      setSettings(data.settings || null);
      if (data.entries?.length && !promoEntryId) {
        setPromoEntryId(data.entries[0].id);
      }
    } catch {
      // Handled gracefully
    }
  }, [adminFetch, promoEntryId, saveAdminToken]);

  useEffect(() => {
    adminFetch('/api/admin/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthenticated(true);
          setAdminUser(data.username || 'syedking12');
          fetchAdminData();
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false));
  }, [adminFetch, fetchAdminData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed.');
        return;
      }
      if (data.token) {
        saveAdminToken(data.token);
      }
      setAuthenticated(true);
      setAdminUser(data.username || 'syedking12');
      setLoginPassword('');
      await fetchAdminData();
    } catch {
      setLoginError('Network error while signing in.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await adminFetch('/api/admin/logout', { method: 'POST' });
    saveAdminToken('');
    setAuthenticated(false);
    setLoginPassword('');
  };

  // Entry Actions
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const res = await adminFetch(`/api/admin/entries/${editingEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingEntry),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Failed to update entry.');
      return;
    }
    setEditingEntry(null);
    showToast('success', 'Community listing updated.');
    fetchAdminData();
    onPublicDataChanged();
  };

  const handleToggleArchiveEntry = async (entry: DirectoryEntry) => {
    const nextStatus = entry.status === 'published' ? 'archived' : 'published';
    const res = await adminFetch(`/api/admin/entries/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      showToast('success', `Entry ${nextStatus === 'published' ? 'restored' : 'archived'}.`);
      fetchAdminData();
      onPublicDataChanged();
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const res = await adminFetch(`/api/admin/entries/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConfirmDeleteEntryId(null);
      showToast('success', 'Entry permanently deleted.');
      fetchAdminData();
      onPublicDataChanged();
    }
  };

  const handleQuickPromoteEntry = async (entry: DirectoryEntry) => {
    if (entry.is_featured) {
      const activePromo = promotions.find(
        (p) => p.entry_id === entry.id && p.status === 'active'
      );
      if (activePromo) {
        await adminFetch(`/api/admin/promotions/${activePromo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        });
        showToast('success', `Removed featured status from ${entry.name}.`);
        fetchAdminData();
        onPublicDataChanged();
      }
      return;
    }

    const res = await adminFetch('/api/admin/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry_id: entry.id,
        duration_days: 7,
        price: 1000,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Could not feature entry (check 10-slot limit).');
      return;
    }
    showToast('success', `${entry.name} marked as Featured (7 days).`);
    fetchAdminData();
    onPublicDataChanged();
  };

  // Category Actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(catForm.id);
    const url = isEdit ? `/api/admin/categories/${catForm.id}` : '/api/admin/categories';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catForm),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Could not save category.');
      return;
    }
    setCatForm({
      id: '',
      name: '',
      slug: '',
      description: '',
      icon: 'Folder',
      seo_title: '',
      seo_description: '',
      sort_order: categories.length + 1,
      is_active: true,
    });
    showToast('success', isEdit ? 'Category updated.' : 'Category created.');
    fetchAdminData();
    onPublicDataChanged();
  };

  const handleDeleteCategory = async (catId: string) => {
    const res = await adminFetch(`/api/admin/categories/${catId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Could not delete category.');
      return;
    }
    showToast('success', `Category deleted. Entries reassigned to ${data.reassignedTo}.`);
    fetchAdminData();
    onPublicDataChanged();
  };

  // Promotion Actions
  const handleCreateManualPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry_id: promoEntryId,
        duration_days: promoDuration,
        price: promoPrice,
        display_order: promoOrder,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Failed to activate promotion.');
      return;
    }
    showToast('success', 'Featured promotion activated.');
    fetchAdminData();
    onPublicDataChanged();
  };

  const handleUpdatePromotionStatus = async (promoId: string, status: string, order?: number) => {
    const res = await adminFetch(`/api/admin/promotions/${promoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, display_order: order }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Could not update promotion.');
      return;
    }
    showToast('success', 'Promotion updated.');
    fetchAdminData();
    onPublicDataChanged();
  };

  // Promotion Request Actions
  const handlePromotionRequestDecision = async (
    reqId: string,
    status: 'approved' | 'rejected',
    notes: string
  ) => {
    const res = await adminFetch(`/api/admin/promotion-requests/${reqId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_notes: notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Failed to update promotion request.');
      return;
    }
    showToast(
      'success',
      status === 'approved' ? 'Promotion request approved and live!' : 'Promotion request rejected.'
    );
    fetchAdminData();
    onPublicDataChanged();
  };

  // Report Actions
  const handleReportAction = async (
    repId: string,
    status: 'reviewed' | 'dismissed',
    entryAction?: 'archive' | 'restore',
    notes?: string
  ) => {
    const res = await adminFetch(`/api/admin/reports/${repId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, entryAction, admin_notes: notes }),
    });
    if (res.ok) {
      showToast('success', 'Report updated.');
      fetchAdminData();
      onPublicDataChanged();
    }
  };

  // Blog CMS Actions
  const insertBlogTag = (snippet: string) => {
    setBlogForm((prev) => ({
      ...prev,
      content: `${prev.content}\n${snippet}`,
    }));
  };

  const handleBlogImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'featured' | 'inline') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const res = await adminFetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, fileName: file.name }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        if (target === 'featured') {
          setBlogForm((prev) => ({ ...prev, featured_image: data.imageUrl }));
        } else {
          setInlineImgUrl(data.imageUrl);
        }
        showToast('success', 'Image uploaded.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(blogForm.id);
    const url = isEdit ? `/api/admin/blogs/${blogForm.id}` : '/api/admin/blogs';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...blogForm,
        tags: blogForm.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Could not save blog article.');
      return;
    }
    setBlogForm({
      id: '',
      title: '',
      slug: '',
      excerpt: '',
      content: '<h2>Introduction</h2><p>Write your community guide here...</p>',
      featured_image: '/src/assets/images/blog_study_groups_1793511059111.jpg',
      seo_title: '',
      seo_description: '',
      category: 'Community Guides',
      tags: 'WhatsApp, Community, Guide',
      status: 'published',
    });
    showToast('success', isEdit ? 'Blog article updated.' : 'Blog article published.');
    fetchAdminData();
    onPublicDataChanged();
  };

  const handleDeleteBlogPost = async (id: string) => {
    const res = await adminFetch(`/api/admin/blogs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('success', 'Blog post deleted.');
      fetchAdminData();
      onPublicDataChanged();
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const res = await adminFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      showToast('success', 'Configuration saved.');
      fetchAdminData();
      onPublicDataChanged();
    }
  };

  // Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/security/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Could not update password.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setGeneratedHash(data.generatedEnvHash || '');
    showToast('success', 'Admin password safely hashed with bcrypt ($2y$12$) and updated.');
  };

  // Unauthenticated Login Gate
  if (authenticated === false) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <WtLinksLogo className="w-9 h-9" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                WT-LINKS Admin Console
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Private /sk Route · Powered by SK MODS
              </p>
            </div>
          </div>

          {loginError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 flex items-start gap-2 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Admin Username
              </label>
              <input
                id="admin-username"
                type="text"
                required
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#16A34A]"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#16A34A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{loggingIn ? 'Verifying Credentials...' : 'Sign In to /sk Dashboard'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Protected by Bcrypt ($2y$12$) KDF</span>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-[#16A34A] hover:underline cursor-pointer"
            >
              ← Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authenticated === null) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center text-sm text-slate-500">
        Verifying admin session...
      </div>
    );
  }

  const renderEntryManagementTable = (targetType: 'group' | 'channel') => {
    const filtered = entries.filter((e) => {
      if (e.type !== targetType) return false;
      if (entryCategoryFilter !== 'all' && e.category_id !== entryCategoryFilter) return false;
      if (entrySearch.trim()) {
        const q = entrySearch.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          (e.category_name || '').toLowerCase().includes(q) ||
          e.invite_url.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Manage WhatsApp {targetType === 'group' ? 'Groups' : 'Channels'} ({filtered.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
                placeholder="Search name, category, link..."
                aria-label="Search entries in admin"
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-8 pr-3 py-1.5 text-xs"
              />
            </div>

            <select
              value={entryCategoryFilter}
              onChange={(e) => setEntryCategoryFilter(e.target.value)}
              aria-label="Filter entries by category"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-3 px-4 font-semibold">Name &amp; Invite Link</th>
                <th className="py-3 px-3 font-semibold">Category</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Clicks</th>
                <th className="py-3 px-3 font-semibold">Submitted</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {item.is_featured && (
                        <span className="text-[11px] font-semibold text-[#16A34A]">· Featured</span>
                      )}
                      {item.is_verified && (
                        <span className="text-[11px] text-emerald-600">· Verified</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-tabular truncate max-w-xs">
                      {item.invite_url}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    {item.category_name}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-medium ${
                        item.status === 'published'
                          ? 'text-[#16A34A]'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono-tabular font-semibold">
                    {item.total_clicks.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono-tabular">
                    {item.published_at.split('T')[0]}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setEditingEntry({ ...item })}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPromoteEntry(item)}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] text-[#16A34A] cursor-pointer"
                    >
                      {item.is_featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleArchiveEntry(item)}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-amber-500 cursor-pointer"
                    >
                      {item.status === 'published' ? 'Archive' : 'Restore'}
                    </button>
                    {confirmDeleteEntryId === item.id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(item.id)}
                        className="px-2.5 py-1 rounded bg-red-600 text-white font-semibold cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteEntryId(item.id)}
                        className="px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto py-6 px-4 sm:px-6">
      {/* Top Admin Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <WtLinksLogo className="w-8 h-8" />
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              WT-LINKS Admin Console (/SK)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Signed in as <strong className="text-slate-800 dark:text-slate-200">{adminUser}</strong> · SK MODS by Syed Kashif
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] cursor-pointer"
          >
            View Public Site
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`mb-5 rounded-xl border p-3.5 flex items-center gap-2 text-xs font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Workspace Grid: Sidebar + Main Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1">
          {ADMIN_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                  active
                    ? 'bg-[#16A34A] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                {tab.id === 'promotion-requests' &&
                  overview &&
                  overview.pendingPromotionRequestsCount > 0 && (
                    <span className="font-mono-tabular text-[11px] opacity-90">
                      ({overview.pendingPromotionRequestsCount})
                    </span>
                  )}
                {tab.id === 'reports' && overview && overview.pendingReportsCount > 0 && (
                  <span className="font-mono-tabular text-[11px] opacity-90">
                    ({overview.pendingReportsCount})
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-9 space-y-6">
          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Groups', value: overview.totalGroups },
                  { label: 'Total Channels', value: overview.totalChannels },
                  { label: 'Active Categories', value: overview.totalCategories },
                  { label: 'Total Clicks', value: overview.totalClicks.toLocaleString() },
                  {
                    label: 'Active Promotions',
                    value: `${overview.activePromotionsCount} / 10`,
                  },
                  {
                    label: 'Pending Promo Requests',
                    value: overview.pendingPromotionRequestsCount,
                  },
                  { label: 'Pending Reports', value: overview.pendingReportsCount },
                  { label: 'Published Blogs', value: overview.totalBlogPosts },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                  >
                    <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
                    <div className="mt-1 text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                    Recent Submissions
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {entries.slice(0, 5).map((e) => (
                      <div key={e.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {e.name}
                          </div>
                          <div className="text-slate-500">
                            {e.type} · {e.category_name}
                          </div>
                        </div>
                        <span className="font-mono-tabular text-slate-500 shrink-0">
                          {e.total_clicks} clicks
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                    Recent Reports &amp; Promo Requests
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {reports.slice(0, 3).map((r) => (
                      <div key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            Report: {r.entry_name}
                          </div>
                          <div className="text-slate-500">
                            {r.reason} · {r.status}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('reports')}
                          className="text-[#16A34A] font-semibold hover:underline cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                    {promotionRequests.slice(0, 3).map((pr) => (
                      <div key={pr.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            Promo Request: {pr.entry_name}
                          </div>
                          <div className="text-slate-500">
                            {pr.requested_duration} days · {pr.status}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('promotion-requests')}
                          className="text-[#16A34A] font-semibold hover:underline cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. GROUPS */}
          {activeTab === 'groups' && renderEntryManagementTable('group')}

          {/* 3. CHANNELS */}
          {activeTab === 'channels' && renderEntryManagementTable('channel')}

          {/* 4. CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveCategory}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {catForm.id ? 'Edit Category' : 'Create New Category'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={catForm.name}
                      onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      placeholder="e.g., Scholarships"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Slug (auto-generated if blank)
                    </label>
                    <input
                      type="text"
                      value={catForm.slug}
                      onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                      placeholder="scholarships"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={catForm.sort_order}
                      onChange={(e) =>
                        setCatForm({ ...catForm, sort_order: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    placeholder="Short category description..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#16A34A] text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{catForm.id ? 'Update Category' : 'Add Category'}</span>
                  </button>
                  {catForm.id && (
                    <button
                      type="button"
                      onClick={() =>
                        setCatForm({
                          id: '',
                          name: '',
                          slug: '',
                          description: '',
                          icon: 'Folder',
                          seo_title: '',
                          seo_description: '',
                          sort_order: categories.length + 1,
                          is_active: true,
                        })
                      }
                      className="text-xs text-slate-500 hover:underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-3 px-4">Order</th>
                      <th className="py-3 px-3">Name &amp; Slug</th>
                      <th className="py-3 px-3 text-right">Groups</th>
                      <th className="py-3 px-3 text-right">Channels</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-4 font-mono-tabular">{c.sort_order}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-slate-400">/{c.slug}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular">
                          {c.group_count || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular">
                          {c.channel_count || 0}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={c.is_active ? 'text-[#16A34A]' : 'text-slate-400'}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCatForm({
                                id: c.id,
                                name: c.name,
                                slug: c.slug,
                                description: c.description,
                                icon: c.icon,
                                seo_title: c.seo_title,
                                seo_description: c.seo_description,
                                sort_order: c.sort_order,
                                is_active: c.is_active,
                              })
                            }
                            className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.id)}
                            className="px-2.5 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. PROMOTIONS (Max 10 Active Global Cap) */}
          {activeTab === 'promotions' && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateManualPromotion}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Manually Promote a Group or Channel
                  </h2>
                  <span className="text-xs font-mono-tabular font-semibold text-[#16A34A]">
                    Active Slots: {overview?.activePromotionsCount || 0} / 10 Max
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Select Entry</label>
                    <select
                      value={promoEntryId}
                      onChange={(e) => setPromoEntryId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    >
                      {entries.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Duration (Days)</label>
                    <select
                      value={promoDuration}
                      onChange={(e) => setPromoDuration(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    >
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days</option>
                      <option value={15}>15 Days</option>
                      <option value={30}>30 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Price (PKR)</label>
                    <input
                      type="number"
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#16A34A] text-white cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Activate Promotion Slot</span>
                </button>
              </form>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-3 px-4">Order</th>
                      <th className="py-3 px-3">Community</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Duration &amp; Price</th>
                      <th className="py-3 px-3">Expires At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {promotions.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4 font-mono-tabular">{p.display_order}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {p.entry_name} ({p.entry_type})
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={
                              p.status === 'active'
                                ? 'text-[#16A34A] font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono-tabular">
                          {p.duration_days}d · {p.currency} {p.price}
                        </td>
                        <td className="py-3 px-3 font-mono-tabular text-slate-500">
                          {p.end_at.split('T')[0]}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {p.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdatePromotionStatus(p.id, 'cancelled')}
                              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-red-600 cursor-pointer"
                            >
                              End Promotion
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdatePromotionStatus(p.id, 'active')}
                              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[#16A34A] cursor-pointer"
                            >
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. PROMOTION REQUESTS */}
          {activeTab === 'promotion-requests' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                User Promotion Requests ({promotionRequests.length})
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {promotionRequests.map((pr) => (
                  <div
                    key={pr.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {pr.entry_name} ({pr.entry_type})
                      </div>
                      <div className="text-slate-500 font-mono-tabular mt-0.5">
                        Requested: {pr.requested_duration} days · PKR {pr.requested_price} · Status:{' '}
                        <strong>{pr.status}</strong>
                      </div>
                      {pr.admin_notes && (
                        <div className="text-slate-400 mt-1">Note: {pr.admin_notes}</div>
                      )}
                    </div>
                    {pr.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handlePromotionRequestDecision(
                              pr.id,
                              'approved',
                              'Approved by SK MODS Admin'
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#16A34A] text-white font-semibold cursor-pointer"
                        >
                          Approve &amp; Feature
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handlePromotionRequestDecision(pr.id, 'rejected', 'Declined')
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-red-600 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. REPORTS */}
          {activeTab === 'reports' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Community Reports ({reports.length})
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {rep.entry_name} · <span className="text-red-600">{rep.reason}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {rep.description || 'No additional description provided.'}
                      </p>
                      <div className="text-slate-400 mt-1 font-mono-tabular">
                        Status: {rep.status} · Reported {rep.created_at.split('T')[0]}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(
                            rep.id,
                            'reviewed',
                            'archive',
                            'Archived reported listing'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold cursor-pointer"
                      >
                        Archive Listing
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleReportAction(rep.id, 'reviewed', 'restore', 'Restored listing')
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        Restore Listing
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReportAction(rep.id, 'dismissed')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. BLOG POSTS CMS */}
          {activeTab === 'blogs' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveBlogPost}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
              >
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {blogForm.id ? 'Edit Blog Post' : 'Write & Publish New Blog Post'}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Article Title *</label>
                    <input
                      type="text"
                      required
                      value={blogForm.title}
                      onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                      placeholder="e.g., Top 15 WhatsApp Channels for Pakistani Developers"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      URL Slug (auto-generated if blank)
                    </label>
                    <input
                      type="text"
                      value={blogForm.slug}
                      onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                      placeholder="top-whatsapp-channels-developers"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Category</label>
                    <input
                      type="text"
                      value={blogForm.category}
                      onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      value={blogForm.tags}
                      onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Publishing Status</label>
                    <select
                      value={blogForm.status}
                      onChange={(e) =>
                        setBlogForm({
                          ...blogForm,
                          status: e.target.value as 'draft' | 'published',
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Short Excerpt</label>
                  <input
                    type="text"
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                    placeholder="1-2 sentence summary for cards and meta description..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>

                {/* Featured Image Upload or URL */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs text-slate-500 mb-1">Featured Image URL</label>
                    <input
                      type="text"
                      value={blogForm.featured_image}
                      onChange={(e) =>
                        setBlogForm({ ...blogForm, featured_image: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Cover</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleBlogImageFileUpload(e, 'featured')}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Lightweight Blogger Formatting Toolbar */}
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {[
                      { label: 'H2', snippet: '<h2>Section Heading</h2>' },
                      { label: 'H3', snippet: '<h3>Subheading</h3>' },
                      { label: 'Paragraph', snippet: '<p>Paragraph text...</p>' },
                      { label: 'Bold', snippet: '<strong>bold text</strong>' },
                      { label: 'Italic', snippet: '<em>italic text</em>' },
                      {
                        label: 'Link',
                        snippet: '<a href="https://wagrouplinks.vercel.app">WT-LINKS</a>',
                      },
                      {
                        label: 'Bullet List',
                        snippet: '<ul>\n  <li>First point</li>\n  <li>Second point</li>\n</ul>',
                      },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => insertBlogTag(btn.snippet)}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-medium hover:border-[#16A34A] cursor-pointer"
                      >
                        + {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Insert Image into Content with Caption & Alignment */}
                  <div className="mb-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <input
                      type="text"
                      value={inlineImgUrl}
                      onChange={(e) => setInlineImgUrl(e.target.value)}
                      placeholder="Image URL or upload..."
                      className="flex-1 min-w-[160px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs"
                    />
                    <label className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                      Upload File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleBlogImageFileUpload(e, 'inline')}
                        className="sr-only"
                      />
                    </label>
                    <input
                      type="text"
                      value={inlineImgCaption}
                      onChange={(e) => setInlineImgCaption(e.target.value)}
                      placeholder="Image caption"
                      className="w-36 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs"
                    />
                    <select
                      value={inlineImgAlign}
                      onChange={(e) =>
                        setInlineImgAlign(e.target.value as 'center' | 'left' | 'right')
                      }
                      className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs"
                    >
                      <option value="center">Align Center</option>
                      <option value="left">Align Left</option>
                      <option value="right">Align Right</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!inlineImgUrl.trim()) return;
                        insertBlogTag(
                          `<figure class="my-4 text-${inlineImgAlign}"><img src="${inlineImgUrl.trim()}" alt="${
                            inlineImgCaption || 'Blog illustration'
                          }" class="rounded-xl max-h-96 mx-auto" /><figcaption class="text-xs text-slate-500 mt-1">${inlineImgCaption}</figcaption></figure>`
                        );
                        setInlineImgUrl('');
                        setInlineImgCaption('');
                      }}
                      className="px-3 py-1 rounded bg-slate-900 text-white font-semibold cursor-pointer"
                    >
                      Insert Image
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    required
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-xs font-mono-tabular"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">SEO Title</label>
                    <input
                      type="text"
                      value={blogForm.seo_title}
                      onChange={(e) => setBlogForm({ ...blogForm, seo_title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">SEO Meta Description</label>
                    <input
                      type="text"
                      value={blogForm.seo_description}
                      onChange={(e) =>
                        setBlogForm({ ...blogForm, seo_description: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#16A34A] text-white cursor-pointer"
                  >
                    {blogForm.id ? 'Save Article Changes' : 'Publish Blog Article'}
                  </button>
                  {blogForm.id && (
                    <button
                      type="button"
                      onClick={() =>
                        setBlogForm({
                          id: '',
                          title: '',
                          slug: '',
                          excerpt: '',
                          content: '<h2>Introduction</h2><p>Write your community guide here...</p>',
                          featured_image: '/src/assets/images/blog_study_groups_1793511059111.jpg',
                          seo_title: '',
                          seo_description: '',
                          category: 'Community Guides',
                          tags: 'WhatsApp, Community, Guide',
                          status: 'published',
                        })
                      }
                      className="text-xs text-slate-500 hover:underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Existing Blog Articles ({blogPosts.length})
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {blogPosts.map((post) => (
                    <div
                      key={post.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {post.title}
                        </div>
                        <div className="text-slate-500">
                          /{post.slug} · {post.category} · <strong>{post.status}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setBlogForm({
                              id: post.id,
                              title: post.title,
                              slug: post.slug,
                              excerpt: post.excerpt,
                              content: post.content,
                              featured_image: post.featured_image,
                              seo_title: post.seo_title,
                              seo_description: post.seo_description,
                              category: post.category,
                              tags: (post.tags || []).join(', '),
                              status: post.status === 'draft' ? 'draft' : 'published',
                            })
                          }
                          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlogPost(post.id)}
                          className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 9. ANALYTICS */}
          {activeTab === 'analytics' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Daily Clicks (24h)', value: overview.dailyClicks },
                  { label: 'Weekly Clicks (7d)', value: overview.weeklyClicks },
                  { label: 'Monthly Clicks (30d)', value: overview.monthlyClicks },
                  { label: 'Promotion Clicks', value: overview.promotionClicks },
                  { label: 'Unique Visitors', value: overview.uniqueVisitors },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                  >
                    <div className="text-xs text-slate-500">{m.label}</div>
                    <div className="mt-1 text-xl font-bold font-mono-tabular">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Top Performing Groups &amp; Channels by Legitimate Clicks
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {[...entries]
                    .sort((a, b) => b.total_clicks - a.total_clicks)
                    .slice(0, 10)
                    .map((ent, idx) => (
                      <div key={ent.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-mono-tabular text-slate-400 mr-2">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {ent.name}
                          </span>{' '}
                          <span className="text-slate-500">
                            ({ent.type} · {ent.category_name})
                          </span>
                        </div>
                        <span className="font-mono-tabular font-bold text-[#16A34A]">
                          {ent.total_clicks.toLocaleString()} clicks
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* 10. ADVERTISEMENT SETTINGS (Addsterra) */}
          {activeTab === 'ads' && settings && (
            <form
              onSubmit={handleSaveSettings}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
            >
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Addsterra Monetization &amp; Placement Controls
              </h2>
              <p className="text-xs text-slate-500">
                Configure your actual Addsterra Publisher ID and placement snippets. Disabled slots
                or empty snippets collapse cleanly without blocking user submissions.
              </p>

              <div className="flex items-center gap-3">
                <input
                  id="ads-global-toggle"
                  type="checkbox"
                  checked={settings.ads.enabled_globally}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ads: { ...settings.ads, enabled_globally: e.target.checked },
                    })
                  }
                />
                <label htmlFor="ads-global-toggle" className="text-xs font-semibold">
                  Enable Advertisements Globally
                </label>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Addsterra Publisher ID
                </label>
                <input
                  type="text"
                  value={settings.ads.publisher_id}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ads: { ...settings.ads, publisher_id: e.target.value },
                    })
                  }
                  placeholder="Enter your official Addsterra Publisher ID"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>

              {(
                [
                  ['homepage_ad_enabled', 'homepage_ad_code', 'Homepage Placement'],
                  ['category_ad_enabled', 'category_ad_code', 'Category Pages Placement'],
                  ['detail_ad_enabled', 'detail_ad_code', 'Group/Channel Detail Placement'],
                  ['submit_ad_enabled', 'submit_ad_code', 'Submission Flow Placement'],
                  ['blog_ad_enabled', 'blog_ad_code', 'Blog Articles Placement'],
                ] as const
              ).map(([toggleKey, codeKey, label]) => (
                <div
                  key={toggleKey}
                  className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.ads[toggleKey])}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ads: { ...settings.ads, [toggleKey]: e.target.checked },
                        })
                      }
                    />
                  </div>
                  <input
                    type="text"
                    value={String(settings.ads[codeKey] || '')}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ads: { ...settings.ads, [codeKey]: e.target.value },
                      })
                    }
                    placeholder={`Paste Addsterra snippet or unit key for ${label}`}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-mono-tabular"
                  />
                </div>
              ))}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#16A34A] text-white cursor-pointer"
              >
                Save Advertisement Settings
              </button>
            </form>
          )}

          {/* 11. WEBSITE SETTINGS */}
          {activeTab === 'website' && settings && (
            <form
              onSubmit={handleSaveSettings}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
            >
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Website &amp; SK MODS Branding Settings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Website Name</label>
                  <input
                    type="text"
                    value={settings.site_name}
                    onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Brand Owner</label>
                  <input
                    type="text"
                    value={settings.brand_owner}
                    onChange={(e) => setSettings({ ...settings, brand_owner: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Developer Attribution</label>
                  <input
                    type="text"
                    value={settings.developer_name}
                    onChange={(e) => setSettings({ ...settings, developer_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Official WhatsApp Number</label>
                  <input
                    type="text"
                    value={settings.whatsapp_number}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp_number: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Instagram Handle</label>
                  <input
                    type="text"
                    value={settings.instagram_handle}
                    onChange={(e) =>
                      setSettings({ ...settings, instagram_handle: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#16A34A] text-white cursor-pointer"
              >
                Save Website Settings
              </button>
            </form>
          )}

          {/* 12. SEO SETTINGS */}
          {activeTab === 'seo' && settings && (
            <form
              onSubmit={handleSaveSettings}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
            >
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                SEO, Canonical Domain &amp; Indexing Settings
              </h2>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Canonical Domain URL</label>
                <input
                  type="url"
                  value={settings.canonical_url}
                  onChange={(e) => setSettings({ ...settings, canonical_url: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Default SEO Title</label>
                <input
                  type="text"
                  value={settings.default_seo_title}
                  onChange={(e) =>
                    setSettings({ ...settings, default_seo_title: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Default Meta Description
                </label>
                <textarea
                  rows={2}
                  value={settings.default_seo_description}
                  onChange={(e) =>
                    setSettings({ ...settings, default_seo_description: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-4 text-xs pt-2">
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#16A34A] hover:underline"
                >
                  <span>Inspect /sitemap.xml</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#16A34A] hover:underline"
                >
                  <span>Inspect /robots.txt</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#16A34A] text-white cursor-pointer"
              >
                Save SEO Settings
              </button>
            </form>
          )}

          {/* 13. SECURITY SETTINGS */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <form
                onSubmit={handlePasswordChange}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
              >
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Admin Credentials &amp; Bcrypt ($2y$12$) Password Hash
                </h2>
                <p className="text-xs text-slate-500">
                  Passwords are hashed server-side using <code>bcrypt</code> (cost factor 12,{' '}
                  <code>$2y$12$</code> prefix) and verified against{' '}
                  <code>ADMIN_PASSWORD_HASH</code>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      New Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {generatedHash && (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
                    <div className="text-slate-500 mb-1">
                      Generated <code>ADMIN_PASSWORD_HASH</code> for Vercel Environment Variables:
                    </div>
                    <code className="font-mono-tabular break-all text-[11px]">{generatedHash}</code>
                  </div>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#16A34A] text-white cursor-pointer"
                >
                  Hash &amp; Update Password
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <form
            onSubmit={handleSaveEntry}
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Edit {editingEntry.type === 'group' ? 'Group' : 'Channel'}
            </h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input
                type="text"
                required
                value={editingEntry.name}
                onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Category</label>
              <select
                value={editingEntry.category_id}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, category_id: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">WhatsApp Invite URL</label>
              <input
                type="url"
                required
                value={editingEntry.invite_url}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, invite_url: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Description</label>
              <textarea
                rows={3}
                value={editingEntry.description}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, description: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </div>
            <div className="flex items-center gap-3 text-xs">
              <input
                id="edit-verified"
                type="checkbox"
                checked={editingEntry.is_verified}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, is_verified: e.target.checked })
                }
              />
              <label htmlFor="edit-verified">Mark as Verified Community</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#16A34A] text-white cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
