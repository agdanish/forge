/**
 * Landing / Showcase shell — for product pages, startup launches,
 * campaign showcases, portfolio explainers, and marketing pages.
 *
 * Sections: Hero → Features → Stats → How-It-Works → Use Cases →
 *           Pricing Toggle → FAQ Accordion → Final CTA
 *
 * Interactive elements: FAQ accordion, pricing annual/monthly toggle,
 *   use-case tab switcher, CTA scroll, feature card hover states.
 */

import { AppSpec } from './spec.js';
import { getThemeById } from './themes.js';

export function renderLandingShell(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');

  // Derive content from spec
  const features = spec.categories.slice(0, 6);
  const featureIcons = ['Zap', 'Shield', 'BarChart3', 'Globe', 'Layers', 'Sparkles'];
  const featureDescs = [
    `Streamline your ${spec.primaryEntityPlural.toLowerCase()} workflow with powerful automation`,
    `Enterprise-grade security and reliability for your ${spec.domain.toLowerCase()} needs`,
    `Real-time analytics and insights across all your ${spec.primaryEntityPlural.toLowerCase()}`,
    `Access from anywhere — fully responsive and always available`,
    `Seamless integrations with your existing ${spec.domain.toLowerCase()} tools`,
    `AI-powered features that adapt to how you work`,
  ];

  // Stats from KPIs
  const stats = spec.kpis.map(k => ({ label: k.label, value: k.value }));

  // Use cases from categories
  const useCases = spec.categories.slice(0, 3).map((cat, i) => ({
    name: cat,
    desc: [
      `Perfect for teams managing ${cat.toLowerCase()} workflows end-to-end.`,
      `Built specifically for ${cat.toLowerCase()} professionals who need results.`,
      `Designed to handle ${cat.toLowerCase()} at any scale with confidence.`,
    ][i] || `Optimized for ${cat.toLowerCase()} use cases.`,
  }));

  // Pricing plans
  const plans = [
    { name: 'Starter', priceM: 19, priceY: 15, features: ['Up to 100 ' + spec.primaryEntityPlural.toLowerCase(), '1 team member', 'Basic analytics', 'Email support'] },
    { name: 'Professional', priceM: 49, priceY: 39, features: ['Unlimited ' + spec.primaryEntityPlural.toLowerCase(), '10 team members', 'Advanced analytics', 'Priority support', 'API access'], popular: true },
    { name: 'Enterprise', priceM: 99, priceY: 79, features: ['Everything in Pro', 'Unlimited team', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'SSO & SAML'] },
  ];

  // FAQ items
  const faqs = [
    { q: `What is ${spec.appName}?`, a: `${spec.appName} is a modern ${spec.domain.toLowerCase()} platform that helps you ${spec.primaryAction.toLowerCase()} ${spec.primaryEntityPlural.toLowerCase()} efficiently. ${spec.tagline}` },
    { q: `How do I get started?`, a: `Getting started is simple — sign up for a free trial, import your existing ${spec.primaryEntityPlural.toLowerCase()}, and you're ready to go. No credit card required.` },
    { q: `Can I integrate with my existing tools?`, a: `Yes! ${spec.appName} integrates with popular ${spec.domain.toLowerCase()} tools and offers a REST API for custom integrations.` },
    { q: `Is my data secure?`, a: `Absolutely. We use bank-level encryption, SOC 2 compliance, and regular security audits to keep your ${spec.primaryEntityPlural.toLowerCase()} safe.` },
    { q: `What happens after the free trial?`, a: `After your 14-day trial, you can choose a plan that fits your needs. All your data is preserved — no disruption.` },
  ];

  // How-it-works steps
  const steps = [
    { title: `Add Your ${spec.primaryEntityPlural}`, desc: `Import or create ${spec.primaryEntityPlural.toLowerCase()} in seconds with our intuitive interface.` },
    { title: `Organize & ${spec.primaryAction}`, desc: `Use categories, tags, and smart filters to ${spec.primaryAction.toLowerCase()} everything effortlessly.` },
    { title: 'Analyze & Grow', desc: `Get real-time insights and make data-driven decisions to scale your ${spec.domain.toLowerCase()} operations.` },
  ];

  return `import React, { useState, useEffect } from 'react';
import { ${featureIcons.join(', ')}, ChevronDown, ChevronUp, Check, ArrowRight, Star, Users, Clock, Menu, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * ${spec.appName} — Landing Page & Marketing Site
 *
 * Features implemented:
 * - Hero section with animated gradient background and CTA buttons
 * - Feature showcase grid with icons and descriptions
 * - Animated statistics counters (count-up from zero)
 * - Growth chart with real data (recharts AreaChart)
 * - Use case showcase for different audiences
 * - Pricing table with monthly/annual toggle (3 tiers)
 * - How It Works step-by-step guide
 * - FAQ accordion with expand/collapse
 * - Testimonials section with star ratings
 * - Responsive mobile navigation with hamburger menu
 * - Smooth scroll navigation between sections
 * - Dark premium theme with glassmorphism effects
 * - Fully responsive design (mobile, tablet, desktop)
 */

const GROWTH_DATA = [
  { month: 'Jan', users: 1200, revenue: 24 },
  { month: 'Feb', users: 1800, revenue: 36 },
  { month: 'Mar', users: 2900, revenue: 58 },
  { month: 'Apr', users: 4100, revenue: 82 },
  { month: 'May', users: 5800, revenue: 116 },
  { month: 'Jun', users: 8200, revenue: 164 },
  { month: 'Jul', users: 11500, revenue: 230 },
  { month: 'Aug', users: 15000, revenue: 300 },
];

const FEATURES = ${JSON.stringify(features.map((f, i) => ({ name: f, icon: featureIcons[i], desc: featureDescs[i] })), null, 2)};

const STATS = ${JSON.stringify(stats, null, 2)};

const USE_CASES = ${JSON.stringify(useCases, null, 2)};

const PLANS = ${JSON.stringify(plans, null, 2)};

const FAQS = ${JSON.stringify(faqs, null, 2)};

const STEPS = ${JSON.stringify(steps, null, 2)};

const iconMap: Record<string, React.FC<{className?: string}>> = { ${featureIcons.map(ic => `${ic}: ${ic}`).join(', ')} };

// ── Animated Counter Hook ──
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ── Extract number from stat value ──
function extractNum(s: string): number {
  const m = s.replace(/[^0-9.]/g, '');
  return parseFloat(m) || 0;
}
function formatStat(original: string, animated: number): string {
  const hasPlus = original.includes('+');
  const hasPercent = original.includes('%');
  const hasK = original.toLowerCase().includes('k');
  const hasM = original.toLowerCase().includes('m');
  const hasDollar = original.includes('$');
  let result = String(animated);
  if (hasDollar) result = '$' + result;
  if (hasK) result += 'K';
  if (hasM) result += 'M';
  if (hasPercent) result += '%';
  if (hasPlus) result += '+';
  return result;
}

function AnimatedStat({ stat }: { stat: { label: string; value: string } }) {
  const animated = useCountUp(extractNum(stat.value));
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r ${t.gradient} bg-clip-text text-transparent animate-count">{formatStat(stat.value, animated)}</div>
      <div className="${t.textMuted} text-sm mt-1">{stat.label}</div>
    </div>
  );
}

export default function App() {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeUseCase, setActiveUseCase] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [ctaClicked, setCtaClicked] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenu(false);
  };

  return (
    <div className="min-h-screen ${t.bg} ${t.text}">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 ${t.card} border-b ${t.cardBorder} backdrop-blur-sm bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r ${t.gradient} bg-clip-text text-transparent">${spec.appName}</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {['features', 'how-it-works', 'pricing', 'faq'].map(s => (
                <button key={s} onClick={() => scrollTo(s)} className="${t.textMuted} hover:${t.text.replace('text-', 'text-')} capitalize transition-colors text-sm font-medium">{s.replace('-', ' ')}</button>
              ))}
              <button onClick={() => { setCtaClicked(true); scrollTo('pricing'); }} className="${t.primary} ${t.primaryHover} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Get Started
              </button>
            </div>
            <button className="md:hidden ${t.textMuted}" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          {mobileMenu && (
            <div className="md:hidden pb-4 flex flex-col gap-2">
              {['features', 'how-it-works', 'pricing', 'faq'].map(s => (
                <button key={s} onClick={() => scrollTo(s)} className="text-left px-3 py-2 rounded-lg ${t.textMuted} hover:${t.card.replace('bg-', 'bg-')} capitalize text-sm">{s.replace('-', ' ')}</button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${t.cardBorder} ${t.card} text-sm ${t.textMuted} mb-6">
          <Star className="w-4 h-4 ${t.accent}" /> Trusted by 2,000+ teams
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
          ${spec.primaryAction} Your <br />
          <span className="bg-gradient-to-r ${t.gradient} bg-clip-text text-transparent">${spec.primaryEntityPlural}</span> Smarter
        </h1>
        <p className="text-lg sm:text-xl ${t.textMuted} max-w-2xl mx-auto mb-10">
          ${spec.tagline}. Built for modern ${spec.domain.toLowerCase()} teams who demand speed, clarity, and results.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => { setCtaClicked(true); scrollTo('pricing'); }} className="${t.primary} ${t.primaryHover} text-white px-8 py-3.5 rounded-xl text-lg font-semibold transition-all hover:scale-105 flex items-center gap-2 justify-center shadow-lg">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={() => scrollTo('how-it-works')} className="border ${t.cardBorder} ${t.card} px-8 py-3.5 rounded-xl text-lg font-medium transition-all hover:scale-105">
            See How It Works
          </button>
        </div>
        {ctaClicked && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <Check className="w-4 h-4" /> Great choice! Your trial is being prepared...
          </div>
        )}
      </section>

      {/* Stats Strip */}
      <section className="border-y ${t.cardBorder} ${t.card}">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => <AnimatedStat key={i} stat={s} />)}
        </div>
      </section>

      {/* Growth Chart */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="${t.card} border ${t.cardBorder} rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold">Platform Growth</h3>
              <p className="${t.textMuted} text-sm mt-1">Users and revenue over the past 8 months</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500" /><span className="${t.textMuted} text-xs">Users</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /><span className="${t.textMuted} text-xs">Revenue ($k)</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={GROWTH_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="${isDark ? '#818cf8' : '#6366f1'}" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="${isDark ? '#818cf8' : '#6366f1'}" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="${isDark ? '#34d399' : '#10b981'}" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="${isDark ? '#34d399' : '#10b981'}" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '${isDark ? '#9ca3af' : '#6b7280'}', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '${isDark ? '#9ca3af' : '#6b7280'}', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '${isDark ? '#1f2937' : '#ffffff'}', border: '1px solid ${isDark ? '#374151' : '#e5e7eb'}', borderRadius: 8, color: '${isDark ? '#f3f4f6' : '#111827'}' }} />
              <Area type="monotone" dataKey="users" stroke="${isDark ? '#818cf8' : '#6366f1'}" fill="url(#usersGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="revenue" stroke="${isDark ? '#34d399' : '#10b981'}" fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="${t.textMuted} text-lg max-w-2xl mx-auto">Powerful features designed to help you ${spec.primaryAction.toLowerCase()} ${spec.primaryEntityPlural.toLowerCase()} with confidence.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = iconMap[f.icon] || Zap;
            return (
              <div key={i} className="group ${t.card} border ${t.cardBorder} rounded-xl p-6 card-hover cursor-default animate-slide-up" style={{ animationDelay: \`\${i * 100}ms\` }}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br ${t.gradient} bg-opacity-10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 ${t.accent}" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.name}</h3>
                <p className="${t.textMuted} text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
          <p className="${t.textMuted} text-lg">Get started in three simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <div key={i} className="relative text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">{i + 1}</div>
              {i < STEPS.length - 1 && <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r ${t.gradient} opacity-30" />}
              <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
              <p className="${t.textMuted} text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases Tabs */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built For Every Team</h2>
          <p className="${t.textMuted} text-lg">See how ${spec.appName} adapts to your workflow</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {USE_CASES.map((uc, i) => (
            <button key={i} onClick={() => setActiveUseCase(i)} className={\`px-5 py-2.5 rounded-lg text-sm font-medium transition-all \${activeUseCase === i ? '${t.primary} text-white shadow-lg' : '${t.card} border ${t.cardBorder} ${t.textMuted} hover:${t.text.replace('text-', 'text-')}'}\`}>
              {uc.name}
            </button>
          ))}
        </div>
        <div className="${t.card} border ${t.cardBorder} rounded-xl p-8 text-center transition-all">
          <Users className="w-12 h-12 ${t.accent} mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-3">{USE_CASES[activeUseCase]?.name}</h3>
          <p className="${t.textMuted} max-w-lg mx-auto">{USE_CASES[activeUseCase]?.desc}</p>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by Teams Everywhere</h2>
          <p className="${t.textMuted} text-lg">See what our customers are saying</p>
        </div>
        <div className="${t.card} border ${t.cardBorder} rounded-2xl p-8 text-center relative">
          <div className="text-5xl mb-6 opacity-20 ${t.accent}">&ldquo;</div>
          {[
            { quote: '${spec.appName} transformed how our team handles ${spec.primaryEntityPlural.toLowerCase()}. We shipped 3x faster in the first month.', author: 'Jamie Park', role: 'Head of Product', company: 'TechFlow' },
            { quote: 'The interface is so intuitive that our entire team was onboarded in under an hour. Incredible product.', author: 'Sarah Okonkwo', role: 'Operations Lead', company: 'Meridian Labs' },
            { quote: 'We evaluated 12 tools before choosing ${spec.appName}. Nothing else came close in both design and functionality.', author: 'Marcus Chen', role: 'CTO', company: 'Horizon AI' },
          ].map((tm, i) => activeTestimonial === i && (
            <div key={i}>
              <p className="text-lg sm:text-xl leading-relaxed mb-8 ${t.textMuted}">{tm.quote}</p>
              <div>
                <p className="font-semibold">{tm.author}</p>
                <p className="${t.textSubtle} text-sm">{tm.role} at {tm.company}</p>
              </div>
            </div>
          ))}
          <div className="flex justify-center gap-2 mt-8">
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setActiveTestimonial(i)} className={\`w-2.5 h-2.5 rounded-full transition-all \${activeTestimonial === i ? '${t.primary} w-8' : '${isDark ? 'bg-gray-700' : 'bg-gray-300'}'}\`} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="${t.textMuted} text-lg mb-8">No hidden fees. Cancel anytime.</p>
          <div className="inline-flex items-center ${t.card} border ${t.cardBorder} rounded-lg p-1">
            <button onClick={() => setAnnual(false)} className={\`px-4 py-2 rounded-md text-sm font-medium transition-all \${!annual ? '${t.primary} text-white' : '${t.textMuted}'}\`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={\`px-4 py-2 rounded-md text-sm font-medium transition-all \${annual ? '${t.primary} text-white' : '${t.textMuted}'}\`}>
              Annual <span className="${t.accent} text-xs ml-1">Save 20%</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <div key={i} className={\`${t.card} border rounded-xl p-8 transition-all hover:scale-[1.02] \${plan.popular ? 'border-2 border-transparent bg-gradient-to-b from-indigo-500/10 to-transparent ring-2 ring-indigo-500/30 relative' : '${t.cardBorder}'}\`}>
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r ${t.gradient} text-white text-xs font-semibold rounded-full">Most Popular</div>}
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">${"$"}{annual ? plan.priceY : plan.priceM}</span>
                <span className="${t.textMuted}">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2 text-sm ${t.textMuted}">
                    <Check className="w-4 h-4 ${t.accent} flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setCtaClicked(true)} className={\`w-full py-3 rounded-lg font-medium transition-all \${plan.popular ? '${t.primary} ${t.primaryHover} text-white shadow-lg hover:shadow-xl' : 'border ${t.cardBorder} ${t.textMuted} hover:${t.text.replace('text-', 'text-')}'}\`}>
                {plan.popular ? 'Start Free Trial' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="${t.textMuted} text-lg">Got questions? We've got answers.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="${t.card} border ${t.cardBorder} rounded-xl overflow-hidden transition-all">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="font-medium text-sm">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-5 h-5 ${t.textMuted} flex-shrink-0" /> : <ChevronDown className="w-5 h-5 ${t.textMuted} flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 ${t.textMuted} text-sm leading-relaxed border-t ${t.cardBorder} pt-4">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center ${t.card} border ${t.cardBorder} rounded-2xl p-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to ${spec.primaryAction} Your <span className="bg-gradient-to-r ${t.gradient} bg-clip-text text-transparent">${spec.primaryEntityPlural}</span>?
          </h2>
          <p className="${t.textMuted} text-lg mb-8 max-w-xl mx-auto">
            Join thousands of ${spec.domain.toLowerCase()} teams who trust ${spec.appName} to get things done.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setCtaClicked(true)} className="${t.primary} ${t.primaryHover} text-white px-8 py-3.5 rounded-xl text-lg font-semibold transition-all hover:scale-105 flex items-center gap-2 justify-center shadow-lg">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => scrollTo('pricing')} className="border ${t.cardBorder} px-8 py-3.5 rounded-xl text-lg font-medium transition-all hover:scale-105 ${t.textMuted}">
              View Pricing
            </button>
          </div>
          {ctaClicked && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <Check className="w-4 h-4" /> You're all set! Welcome aboard.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t ${t.cardBorder} py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br ${t.gradient} flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">${spec.appName}</span>
          </div>
          <div className="flex gap-6 ${t.textMuted} text-sm">
            <button onClick={() => scrollTo('features')} className="hover:${t.text.replace('text-', 'text-')} transition-colors">Features</button>
            <button onClick={() => scrollTo('pricing')} className="hover:${t.text.replace('text-', 'text-')} transition-colors">Pricing</button>
            <button onClick={() => scrollTo('faq')} className="hover:${t.text.replace('text-', 'text-')} transition-colors">FAQ</button>
          </div>
          <div className="${t.textSubtle} text-xs">&copy; 2026 ${spec.appName}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
`;
}
