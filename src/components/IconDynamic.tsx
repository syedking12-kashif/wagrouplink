import React from 'react';
import {
  BookOpen,
  GraduationCap,
  Briefcase,
  Cpu,
  Tv,
  Users,
  Heart,
  MessageCircle,
  TrendingUp,
  Gamepad2,
  Trophy,
  Newspaper,
  Activity,
  ShoppingBag,
  Compass,
  Film,
  Music,
  Code2,
  Laptop,
  Grid,
  Folder,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  GraduationCap,
  Briefcase,
  Cpu,
  Tv,
  Users,
  Heart,
  MessageCircle,
  TrendingUp,
  Gamepad2,
  Trophy,
  Newspaper,
  Activity,
  ShoppingBag,
  Compass,
  Film,
  Music,
  Code2,
  Laptop,
  Grid,
  Folder,
};

export function CategoryIcon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const IconComp = ICON_MAP[name] || Folder;
  return <IconComp className={className} />;
}

export function WtLinksLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="9" fill="#16A34A" />
      <path
        d="M18 8.5C12.7533 8.5 8.5 12.589 8.5 17.6333C8.5 19.4426 9.04815 21.1292 9.99259 22.5485L8.95 26.85L13.4281 25.6914C14.7911 26.3822 16.3489 26.7667 18 26.7667C23.2467 26.7667 27.5 22.6776 27.5 17.6333C27.5 12.589 23.2467 8.5 18 8.5Z"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.7 19.3L16.8 21.4L21.5 14.8"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
