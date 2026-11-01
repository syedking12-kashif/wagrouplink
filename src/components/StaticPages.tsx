import React, { useState } from 'react';
import {
  Mail,
  MessageCircle,
  Instagram,
  Search,
  ArrowRight,
  Flag,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { BlogPost, Category, DirectoryEntry, SiteSettings } from '../types';
import { WtLinksLogo, CategoryIcon } from './IconDynamic';
import { AdPlacement } from './AdPlacement';

export function BlogListView({
  posts,
  settings,
  onNavigate,
}: {
  posts: BlogPost[];
  settings: SiteSettings;
  onNavigate: (path: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400 mb-1">
            WT-LINKS Editorial &amp; Community Guides
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            WhatsApp Community Blog
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Practical guides on discovering study groups, verifying job alerts, and growing WhatsApp
            channels.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            aria-label="Search blog articles"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-3.5 py-2 text-sm focus:outline-none focus:border-[#16A34A]"
          />
        </div>
      </div>

      <AdPlacement slot="blog" ads={settings.ads} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No blog articles match "{search}".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <img
                    src={
                      post.featured_image ||
                      '/src/assets/images/blog_study_groups_1793511059111.jpg'
                    }
                    alt={post.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span className="font-medium text-[#16A34A] dark:text-emerald-400">
                      {post.category}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(post.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    <a
                      href={`/blog/${post.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(`/blog/${post.slug}`);
                      }}
                      className="hover:text-[#16A34A] transition-colors"
                    >
                      {post.title}
                    </a>
                  </h2>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
              </div>
              <div className="px-5 pb-5 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate(`/blog/${post.slug}`)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlogDetailView({
  post,
  related,
  settings,
  onNavigate,
}: {
  post: BlogPost;
  related: BlogPost[];
  settings: SiteSettings;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={() => onNavigate('/blog')}
          className="hover:text-[#16A34A] cursor-pointer"
        >
          ← Back to Blog
        </button>
        <span>·</span>
        <span className="font-medium text-[#16A34A]">{post.category}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(post.published_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {post.featured_image && (
          <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800">
            <img
              src={post.featured_image}
              alt={post.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {post.excerpt}
          </p>

          <div
            className="mt-8 space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-slate-100 [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100 [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Topics:</span>
              {post.tags.map((tag, idx) => (
                <React.Fragment key={tag}>
                  {idx > 0 && <span>·</span>}
                  <span>{tag}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </article>

      <AdPlacement slot="blog" ads={settings.ads} />

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
            Related Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {related.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
              >
                <div className="text-xs text-[#16A34A] mb-1">{r.category}</div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/blog/${r.slug}`)}
                    className="text-left hover:text-[#16A34A] cursor-pointer"
                  >
                    {r.title}
                  </button>
                </h3>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function StaticContentPage({
  page,
  settings,
  entries,
  onNavigate,
}: {
  page: 'about' | 'contact' | 'terms' | 'privacy-policy' | 'disclaimer' | 'report';
  settings: SiteSettings;
  entries: DirectoryEntry[];
  onNavigate: (path: string) => void;
}) {
  const [selectedEntryId, setSelectedEntryId] = useState(entries[0]?.id || '');
  const [reason, setReason] = useState('Broken invite link');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Contact Inquiry Composer State
  const [contactName, setContactName] = useState('');
  const [contactTopic, setContactTopic] = useState('Featured Promotion Inquiry (7 / 15 / 30 Days)');
  const [contactLink, setContactLink] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntryId) return;
    await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: selectedEntryId,
        reason,
        description,
      }),
    });
    setSubmitted(true);
  };

  const buildContactWhatsAppUrl = () => {
    const cleanPhone = (settings.whatsapp_number || '923254038592').replace(/[^0-9]/g, '');
    const text = [
      'Assalamualaikum Syed Kashif (SK MODS),',
      '',
      `Topic: ${contactTopic}`,
      contactName.trim() ? `Name: ${contactName.trim()}` : '',
      contactLink.trim() ? `Community Link: ${contactLink.trim()}` : '',
      '',
      `Message: ${contactMessage.trim() || 'I would like to connect regarding WT-LINKS.'}`,
    ]
      .filter(Boolean)
      .join('\n');

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const infoNavItems: Array<{
    id: 'about' | 'contact' | 'terms' | 'privacy-policy' | 'disclaimer' | 'report';
    label: string;
    path: string;
  }> = [
    { id: 'about', label: 'About WT-LINKS', path: '/about' },
    { id: 'contact', label: 'Contact Us', path: '/contact' },
    { id: 'terms', label: 'Terms & Conditions', path: '/terms' },
    { id: 'privacy-policy', label: 'Privacy Policy', path: '/privacy-policy' },
    { id: 'disclaimer', label: 'Disclaimer', path: '/disclaimer' },
    { id: 'report', label: 'Report Content', path: '/report' },
  ];

  const renderInfoSubnav = () => (
    <nav
      aria-label="Legal and Informational Pages"
      className="mb-8 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4"
    >
      {infoNavItems.map((item) => {
        const isCurrent = page === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.path)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isCurrent
                ? 'bg-[#16A34A] text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#16A34A]'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  if (page === 'about') {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
        {renderInfoSubnav()}

        <div className="space-y-8">
          {/* Hero Overview Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10">
            <div className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400 mb-2">
              Official Platform Profile · Powered by {settings.brand_owner}
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              About WT-LINKS — WhatsApp Group &amp; Channel Directory
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              <strong>WT-LINKS</strong> (
              <a
                href="https://wagrouplinks.vercel.app"
                className="text-[#16A34A] hover:underline font-medium"
              >
                wagrouplinks.vercel.app
              </a>
              ) is a specialized, SEO-engineered WhatsApp community discovery, instant publishing,
              and featured promotion directory built under the <strong>SK MODS</strong> brand by{' '}
              <strong>Syed Kashif</strong>. We connect students, software engineers, remote job
              seekers, freelancers, and topic enthusiasts with active, verified WhatsApp Groups and
              Broadcast Channels across 20+ structured categories.
            </p>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500">Active Categories</div>
                <div className="text-xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100 mt-0.5">
                  20+ Topics
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Featured Promotion Cap</div>
                <div className="text-xl font-bold font-mono-tabular text-[#16A34A] mt-0.5">
                  Max 10 Slots
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Brand Owner</div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {settings.brand_owner}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Lead Developer</div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {settings.developer_name}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Core Platform Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="text-xs font-mono-tabular font-semibold text-[#16A34A] mb-1">
                01. REAL-TIME METADATA ENGINE
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Automatic WhatsApp Title, Description &amp; Avatar Extraction
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                When community admins paste an official <code>chat.whatsapp.com</code> or{' '}
                <code>whatsapp.com/channel</code> invite link, our backend fetches OpenGraph
                metadata in real time, decodes stylized Unicode fonts and multilingual scripts
                (English, Urdu, Arabic, and emojis) into clean readable text, and captures the live
                group or channel profile photo.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="text-xs font-mono-tabular font-semibold text-[#16A34A] mb-1">
                02. ACCOUNT-FREE INSTANT PUBLISHING
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Zero-Friction Community Submissions
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Public visitors never need to hand over personal passwords or register an account
                to browse, search, or submit a community link. Every validated listing receives a
                dedicated, indexable SEO detail page with structured Schema.org metadata and
                one-click social sharing.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="text-xs font-mono-tabular font-semibold text-[#16A34A] mb-1">
                03. CURATED FEATURED PLACEMENTS
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Strict 10-Slot Homepage Promotion System
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                To guarantee high visibility and prevent ad clutter, WT-LINKS limits Featured
                Promotions to a strict maximum of 10 active slots globally across 7-day, 15-day,
                and 30-day packages—verified directly with SK MODS via WhatsApp.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="text-xs font-mono-tabular font-semibold text-[#16A34A] mb-1">
                04. TRUST &amp; SAFETY MODERATION
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Strict Domain Validation &amp; Community Reporting
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Only official HTTPS WhatsApp domains are accepted—blocking phishing and external
                redirect links at submission time. Visitors can flag broken links, wrong categories,
                or spam in two clicks for immediate review by the SK MODS moderation team.
              </p>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Frequently Asked Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Is submitting a WhatsApp group or channel free?
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Yes. Standard directory submissions are 100% free and go live immediately once
                  your official WhatsApp link passes validation.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  How do I promote my group in the Featured section?
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Open your published group or channel page, click <strong>Promote This Group</strong>,
                  choose a duration (7, 15, or 30 days), and send the pre-filled WhatsApp request to{' '}
                  <code>+92 325 4038592</code>.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  What if my group invite link is reset by WhatsApp?
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                  If you revoke or regenerate your invite link inside WhatsApp, submit a quick
                  update request via the Contact or Report page so our team can update your slug or
                  archive the old invite code.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Who develops and maintains WT-LINKS?
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                  WT-LINKS is engineered and maintained by <strong>Syed Kashif</strong> under the{' '}
                  <strong>SK MODS</strong> brand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'contact') {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
        {renderInfoSubnav()}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Official Contact Channels */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
              <div>
                <div className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400 mb-1">
                  Direct Support Desk · {settings.brand_owner}
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Contact Syed Kashif &amp; SK MODS
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Reach out directly for Featured Homepage Promotions, community verification badges,
                  listing updates, takedown requests, or advertising partnerships.
                </p>
              </div>

              <div className="space-y-3">
                <a
                  href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3.5 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-[#16A34A] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950 text-[#16A34A] flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500">Official WhatsApp (Fastest Reply)</div>
                    <div className="text-sm font-bold font-mono-tabular text-slate-900 dark:text-slate-100 mt-0.5">
                      +{settings.whatsapp_number}
                    </div>
                    <div className="text-[11px] text-[#16A34A] font-medium mt-1">
                      Click to open direct WhatsApp chat →
                    </div>
                  </div>
                </a>

                <a
                  href={`mailto:${settings.contact_email}`}
                  className="flex items-start gap-3.5 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-[#16A34A] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950 text-[#16A34A] flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500">Official Support &amp; Legal Email</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {settings.contact_email}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Typical response within 12–24 hours
                    </div>
                  </div>
                </a>

                <a
                  href="https://instagram.com/Syed_pro_dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3.5 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-[#16A34A] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950 text-[#16A34A] flex items-center justify-center shrink-0">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500">Official Developer Instagram</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {settings.instagram_handle}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Follow SK MODS announcements &amp; updates
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Direct Message Composer */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Send an Instant Inquiry to SK MODS
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Fill out the details below to format your inquiry and send it directly via
                  WhatsApp or Email.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g., Ali Raza"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-topic"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Inquiry Topic
                  </label>
                  <select
                    id="contact-topic"
                    value={contactTopic}
                    onChange={(e) => setContactTopic(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                  >
                    <option value="Featured Promotion Inquiry (7 / 15 / 30 Days)">
                      Featured Promotion Inquiry (7 / 15 / 30 Days)
                    </option>
                    <option value="Verify My Group / Channel Badge">
                      Verify My Group / Channel Badge
                    </option>
                    <option value="Update or Remove Existing Listing">
                      Update or Remove Existing Listing
                    </option>
                    <option value="Advertising & Partnership Inquiry">
                      Advertising &amp; Partnership Inquiry
                    </option>
                    <option value="Technical Support / Feedback">
                      Technical Support / Feedback
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-link"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  WhatsApp Group / Channel Link or WT-LINKS URL (Optional)
                </label>
                <input
                  id="contact-link"
                  type="url"
                  value={contactLink}
                  onChange={(e) => setContactLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/... or https://wagrouplinks.vercel.app/..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono-tabular"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Message Details
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Tell us how we can help with your community listing or promotion..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={buildContactWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send via WhatsApp (+{settings.whatsapp_number})</span>
                </a>
                <a
                  href={`mailto:${settings.contact_email}?subject=${encodeURIComponent(
                    `[WT-LINKS] ${contactTopic}`
                  )}&body=${encodeURIComponent(
                    `Name: ${contactName}\nLink: ${contactLink}\n\n${contactMessage}`
                  )}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#16A34A]"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send via Email Client</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'report') {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
        {renderInfoSubnav()}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-600 mb-2">
            <Flag className="w-4 h-4" />
            <span>Community Safety &amp; Moderation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Report a Group or Channel
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Help keep WT-LINKS safe and accurate. Report broken links, spam, scams, or misleading
            categories without creating an account.
          </p>

          {submitted ? (
            <div className="mt-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
              <span>
                Report received. Our moderation team at SK MODS will review the listing promptly.
              </span>
            </div>
          ) : (
            <form onSubmit={handleReportSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="standalone-report-entry"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Select Group or Channel
                </label>
                <select
                  id="standalone-report-entry"
                  value={selectedEntryId}
                  onChange={(e) => setSelectedEntryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                >
                  {entries.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} ({ent.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="standalone-report-reason"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Reason
                </label>
                <select
                  id="standalone-report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                >
                  {[
                    'Spam',
                    'Scam',
                    'Inappropriate content',
                    'Broken invite link',
                    'Wrong category',
                    'Misleading information',
                    'Other',
                  ].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="standalone-report-desc"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Additional Details (Optional)
                </label>
                <textarea
                  id="standalone-report-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Submit Report
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const legalDocuments: Record<
    'terms' | 'privacy-policy' | 'disclaimer',
    {
      title: string;
      subtitle: string;
      effectiveDate: string;
      sections: Array<{ heading: string; paragraphs: string[] }>;
    }
  > = {
    terms: {
      title: 'Terms and Conditions of Use',
      subtitle:
        'Governing your access to and use of the WT-LINKS WhatsApp Group & Channel Directory operated by SK MODS (Syed Kashif).',
      effectiveDate: 'Last Updated: November 2026',
      sections: [
        {
          heading: '1. Acceptance of Terms & Platform Scope',
          paragraphs: [
            'Welcome to WT-LINKS (https://wagrouplinks.vercel.app), an online community directory owned and operated under the SK MODS brand by Syed Kashif. By browsing, searching, submitting a community link, or requesting a promotion on WT-LINKS, you acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions.',
            'WT-LINKS acts solely as an indexing and discovery service for public WhatsApp Groups and WhatsApp Broadcast Channels submitted by community administrators and users.',
          ],
        },
        {
          heading: '2. Eligibility & Acceptable Invite Links',
          paragraphs: [
            'To maintain directory integrity and protect visitors from phishing or malicious redirects, WT-LINKS strictly accepts only official HTTPS WhatsApp invite URLs: https://chat.whatsapp.com/<invite-code> for Groups and https://whatsapp.com/channel/<channel-id> for Channels.',
            'By submitting an invite link, you represent that you are either the administrator of the community or authorized to share the public invite link, and that the title, category, and description accurately reflect the community topic.',
          ],
        },
        {
          heading: '3. Strict Prohibited Content Policy',
          paragraphs: [
            'SK MODS enforces a zero-tolerance policy against harmful or unlawful communities. You may NOT submit groups or channels that promote or distribute: (a) financial fraud, Ponzi schemes, fake job/loan scams, or phishing links; (b) adult, sexually explicit, or NSFW content; (c) hate speech, harassment, doxxing, or violence; (d) pirated software, malware, or unauthorized account credentials; or (e) illegal goods or services.',
            'Any listing found violating these rules is permanently removed without prior notice, and repeat offenders are blocked from future submissions.',
          ],
        },
        {
          heading: '4. Real-Time Metadata & Profile Picture Extraction',
          paragraphs: [
            'When you submit a WhatsApp invite URL, you authorize WT-LINKS to automatically query public OpenGraph tags (title, description, and community profile image) associated with that link, normalize stylized characters into readable text, and display the preview card on your public WT-LINKS detail page.',
          ],
        },
        {
          heading: '5. Featured Promotions & 10-Slot Global Cap',
          paragraphs: [
            'WT-LINKS offers optional Featured Homepage & Top-of-Directory Promotion packages (7 Days — PKR 1,000; 15 Days — PKR 1,800; 30 Days — PKR 3,000). To ensure fair visibility for sponsors, active Featured Promotions are strictly capped at 10 slots globally at any time.',
            'All promotion requests are coordinated and verified directly with SK MODS via our official WhatsApp number (+92 325 4038592). Promoted listings must comply with all community safety guidelines; promotions automatically expire at the end of the purchased duration.',
          ],
        },
        {
          heading: '6. Moderation, Recategorization & Takedown Rights',
          paragraphs: [
            'SK MODS reserves the right, at its sole discretion, to edit titles for clarity, move listings to a more appropriate category, archive expired or broken invite links, or remove any listing reported by the community.',
            'Group or channel owners who wish to update or remove their listing from WT-LINKS may submit a request at any time via /report or /contact.',
          ],
        },
      ],
    },
    'privacy-policy': {
      title: 'Privacy Policy',
      subtitle:
        'How WT-LINKS (SK MODS) handles visitor privacy, public community metadata, click analytics, and browser preferences.',
      effectiveDate: 'Last Updated: November 2026',
      sections: [
        {
          heading: '1. Account-Free Public Access',
          paragraphs: [
            'WT-LINKS is designed with a privacy-first architecture. Public visitors can browse all 20+ categories, search listings, join WhatsApp groups and channels, submit new community links, and report broken links without creating a user account or providing personal passwords.',
          ],
        },
        {
          heading: '2. Information Processed During Link Submissions',
          paragraphs: [
            'When you submit a WhatsApp Group or Channel to WT-LINKS, we store the public WhatsApp invite URL, the selected category, the community title and description (either auto-fetched from public OpenGraph tags or entered manually), and the community profile image.',
            'Do not include private personal phone numbers, residential addresses, or confidential information inside public group descriptions.',
          ],
        },
        {
          heading: '3. Privacy-Preserving Click Analytics & Abuse Prevention',
          paragraphs: [
            'To rank popular communities accurately and protect our submission and reporting endpoints from automated spam bots, our server computes a one-way cryptographic HMAC-SHA256 visitor hash from request headers with short deduplication windows.',
            'We do not sell, rent, or trade visitor data to third-party data brokers.',
          ],
        },
        {
          heading: '4. Local Storage & Cookies',
          paragraphs: [
            'WT-LINKS uses browser localStorage (wt_links_theme) solely to remember your preferred Light or Dark display mode across visits.',
            'Signed session tokens (wt_admin_session) are used strictly for authenticated platform administrators accessing the private management console.',
          ],
        },
        {
          heading: '5. Third-Party Advertising & External WhatsApp Links',
          paragraphs: [
            'WT-LINKS may display clearly labeled advertisement placements (such as Addsterra banners) on designated pages. When you click "Join Group on WhatsApp" or "Follow Channel on WhatsApp", you leave WT-LINKS and are directed to official WhatsApp domains (chat.whatsapp.com or whatsapp.com/channel), which are governed by WhatsApp’s own Privacy Policy.',
          ],
        },
        {
          heading: '6. Listing Removal & Data Controller Contact',
          paragraphs: [
            'If you are the creator of a WhatsApp group or channel listed on WT-LINKS and wish to have your invite link updated or removed from our directory, please use the Report tool (/report) or contact Syed Kashif (SK MODS) directly at syedkashifrazashah14@gmail.com or via WhatsApp at +92 325 4038592.',
          ],
        },
      ],
    },
    disclaimer: {
      title: 'Legal & Community Safety Disclaimer',
      subtitle:
        'Important disclosures regarding platform independence, third-party WhatsApp communities, and member safety guidelines.',
      effectiveDate: 'Last Updated: November 2026',
      sections: [
        {
          heading: '1. Non-Affiliation with WhatsApp & Meta Platforms',
          paragraphs: [
            'WT-LINKS (https://wagrouplinks.vercel.app) is an independent community discovery platform developed by Syed Kashif under the SK MODS brand. WT-LINKS is NOT affiliated with, endorsed by, sponsored by, or officially connected to WhatsApp LLC, WhatsApp Ireland Limited, or Meta Platforms, Inc.',
            '"WhatsApp" and its associated logos are registered trademarks of WhatsApp LLC.',
          ],
        },
        {
          heading: '2. Third-Party Community Content & Responsibility',
          paragraphs: [
            'All WhatsApp groups and broadcast channels listed in the WT-LINKS directory are created and administered by independent third-party users. While SK MODS validates invite URLs at the time of submission and reviews community abuse reports, we do not control the live messages, files, or interactions that occur inside external WhatsApp chats.',
            'Joining any WhatsApp group or following any channel listed on WT-LINKS is done entirely at your own discretion and risk.',
          ],
        },
        {
          heading: '3. Essential Safety Rules for Joining Public WhatsApp Groups',
          paragraphs: [
            '• Protect Your Personal Privacy: In WhatsApp Settings → Privacy, restrict who can see your Profile Photo, About info, and Status to "My Contacts" before joining large public groups.',
            '• Never Share OTPs, PINs, or Passwords: Legitimate community admins, recruiters, or educators will NEVER ask for your WhatsApp 6-digit verification code, bank PIN, or EasyPaisa/JazzCash OTP.',
            '• Verify Job & Freelance Offers Independently: Never pay upfront registration, training, or security fees to unknown individuals claiming to offer remote jobs inside public groups.',
            '• Report Suspicious Communities Immediately: If a listed group changes its topic to spam, scams, or inappropriate content, click the "Report" button on its WT-LINKS page so our team can archive it immediately.',
          ],
        },
        {
          heading: '4. No Professional or Financial Advice',
          paragraphs: [
            'Communities categorized under Business, Crypto & Trading, Jobs, Education, or Health are shared for informational and networking purposes only. Nothing on WT-LINKS constitutes financial, investment, legal, or medical advice.',
          ],
        },
      ],
    },
  };

  const doc = legalDocuments[page];
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      {renderInfoSubnav()}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#16A34A] dark:text-emerald-400 mb-2">
            <span>WT-LINKS Official Legal Documentation · {settings.brand_owner}</span>
            <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
              {doc.effectiveDate}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {doc.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {doc.subtitle}
          </p>
        </div>

        <div className="space-y-6">
          {doc.sections.map((sec, idx) => (
            <section key={idx} className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {sec.heading}
              </h2>
              {sec.paragraphs.map((p, pIdx) => (
                <p
                  key={pIdx}
                  className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="text-slate-500">
            Questions about this policy? Contact{' '}
            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="font-semibold text-[#16A34A] hover:underline cursor-pointer"
            >
              SK MODS Support ({settings.contact_email})
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="font-semibold text-[#16A34A] hover:underline cursor-pointer"
          >
            ← Return to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}

export function Custom404View({
  categories,
  onNavigate,
  onSearchSubmit,
}: {
  categories: Category[];
  onNavigate: (path: string) => void;
  onSearchSubmit: (q: string) => void;
}) {
  const [query, setQuery] = useState('');

  return (
    <div className="max-w-3xl mx-auto py-14 px-4 sm:px-6 text-center">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12">
        <div className="flex justify-center mb-4">
          <WtLinksLogo className="w-12 h-12" />
        </div>
        <p className="text-xs font-mono-tabular font-semibold text-[#16A34A]">ERROR 404</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
          Page Not Found
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          The group, channel, or page you requested could not be found or may have been archived.
          Search our active directory below:
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit(query);
          }}
          className="mt-6 max-w-md mx-auto flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search groups or channels..."
              aria-label="Search communities on 404 page"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/groups')}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] cursor-pointer"
          >
            Browse Groups
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/channels')}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-[#16A34A] cursor-pointer"
          >
            Browse Channels
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-left">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 text-center">
            Popular Categories
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onNavigate(`/category/${cat.slug}`)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#16A34A] text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <CategoryIcon name={cat.icon} className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
