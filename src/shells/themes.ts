/**
 * Domain-adaptive design themes.
 * Maps detected domains to color/style presets so apps look intentional, not generic.
 */

export interface Theme {
  name: string;
  bg: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryHover: string;
  accent: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  input: string;
  badge: string;
  success: string;
  warning: string;
  danger: string;
  gradient: string;
}

export const THEMES: Record<string, Theme> = {
  'neutral-dark': {
    name: 'Neutral Dark',
    bg: 'bg-gray-950', card: 'bg-gray-900', cardBorder: 'border-gray-800',
    primary: 'bg-indigo-600', primaryHover: 'hover:bg-indigo-500', accent: 'text-indigo-400',
    text: 'text-white', textMuted: 'text-gray-400', textSubtle: 'text-gray-500',
    input: 'bg-gray-800 border-gray-700 text-white placeholder-gray-500',
    badge: 'bg-indigo-900/50 text-indigo-300 border-indigo-800',
    success: 'text-emerald-400', warning: 'text-amber-400', danger: 'text-red-400',
    gradient: 'from-indigo-400 to-purple-400',
  },
  'fintech-dark': {
    name: 'Fintech Dark',
    bg: 'bg-slate-950', card: 'bg-slate-900', cardBorder: 'border-slate-800',
    primary: 'bg-emerald-600', primaryHover: 'hover:bg-emerald-500', accent: 'text-emerald-400',
    text: 'text-white', textMuted: 'text-slate-400', textSubtle: 'text-slate-500',
    input: 'bg-slate-800 border-slate-700 text-white placeholder-slate-500',
    badge: 'bg-emerald-900/50 text-emerald-300 border-emerald-800',
    success: 'text-emerald-400', warning: 'text-amber-400', danger: 'text-red-400',
    gradient: 'from-emerald-400 to-teal-400',
  },
  'creator-dark': {
    name: 'Creator Dark',
    bg: 'bg-zinc-950', card: 'bg-zinc-900', cardBorder: 'border-zinc-800',
    primary: 'bg-violet-600', primaryHover: 'hover:bg-violet-500', accent: 'text-violet-400',
    text: 'text-white', textMuted: 'text-zinc-400', textSubtle: 'text-zinc-500',
    input: 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500',
    badge: 'bg-violet-900/50 text-violet-300 border-violet-800',
    success: 'text-emerald-400', warning: 'text-amber-400', danger: 'text-rose-400',
    gradient: 'from-violet-400 to-pink-400',
  },
  'health-light': {
    name: 'Health Light',
    bg: 'bg-emerald-50', card: 'bg-white', cardBorder: 'border-emerald-200',
    primary: 'bg-emerald-600', primaryHover: 'hover:bg-emerald-500', accent: 'text-emerald-600',
    text: 'text-gray-900', textMuted: 'text-gray-600', textSubtle: 'text-gray-400',
    input: 'bg-white border-emerald-300 text-gray-900 placeholder-gray-400',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    success: 'text-emerald-600', warning: 'text-amber-600', danger: 'text-red-600',
    gradient: 'from-emerald-500 to-teal-500',
  },
  'education-light': {
    name: 'Education Light',
    bg: 'bg-amber-50', card: 'bg-white', cardBorder: 'border-amber-200',
    primary: 'bg-amber-600', primaryHover: 'hover:bg-amber-500', accent: 'text-amber-600',
    text: 'text-gray-900', textMuted: 'text-gray-600', textSubtle: 'text-gray-400',
    input: 'bg-white border-amber-300 text-gray-900 placeholder-gray-400',
    badge: 'bg-amber-100 text-amber-700 border-amber-300',
    success: 'text-emerald-600', warning: 'text-amber-600', danger: 'text-red-600',
    gradient: 'from-amber-500 to-orange-500',
  },
  'neutral-light': {
    name: 'Neutral Light',
    bg: 'bg-gray-50', card: 'bg-white', cardBorder: 'border-gray-200',
    primary: 'bg-blue-600', primaryHover: 'hover:bg-blue-500', accent: 'text-blue-600',
    text: 'text-gray-900', textMuted: 'text-gray-600', textSubtle: 'text-gray-400',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
    success: 'text-emerald-600', warning: 'text-amber-600', danger: 'text-red-600',
    gradient: 'from-blue-500 to-indigo-500',
  },
};

const DOMAIN_THEME_MAP: Record<string, string> = {
  finance: 'fintech-dark', budget: 'fintech-dark', expense: 'fintech-dark',
  payment: 'fintech-dark', invoice: 'fintech-dark', banking: 'fintech-dark',
  health: 'health-light', fitness: 'health-light', wellness: 'health-light',
  workout: 'health-light', medical: 'health-light', nutrition: 'health-light',
  education: 'education-light', learning: 'education-light', course: 'education-light',
  quiz: 'education-light', study: 'education-light', school: 'education-light',
  portfolio: 'creator-dark', gallery: 'creator-dark', creative: 'creator-dark',
  music: 'creator-dark', art: 'creator-dark', design: 'creator-dark',
  social: 'neutral-light', community: 'neutral-light', calendar: 'neutral-light',
  event: 'neutral-light', booking: 'neutral-light', schedule: 'neutral-light',
  shop: 'neutral-light', store: 'neutral-light', ecommerce: 'neutral-light',
  real: 'neutral-light', property: 'neutral-light', recipe: 'neutral-light',
  // Landing / startup / marketing
  startup: 'neutral-dark', saas: 'neutral-dark', launch: 'neutral-dark',
  campaign: 'creator-dark', showcase: 'creator-dark', marketing: 'creator-dark',
  // Extended domains
  wildlife: 'health-light', ocean: 'health-light', environment: 'health-light',
  volunteer: 'neutral-light', nonprofit: 'neutral-light', charity: 'neutral-light',
  podcast: 'creator-dark', film: 'creator-dark', video: 'creator-dark',
  packaging: 'health-light', sustainability: 'health-light',
};

export function getThemeForDomain(prompt: string): Theme {
  const lower = prompt.toLowerCase();
  for (const [keyword, themeId] of Object.entries(DOMAIN_THEME_MAP)) {
    if (lower.includes(keyword)) {
      return THEMES[themeId];
    }
  }
  return THEMES['neutral-dark']; // default
}

export function getThemeById(id: string): Theme {
  return THEMES[id] || THEMES['neutral-dark'];
}
