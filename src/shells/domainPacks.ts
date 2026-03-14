/**
 * Domain packs — deterministic content overrides keyed by prompt domain.
 * Makes shell output feel custom-built instead of generic.
 * Zero LLM cost, <1ms application time.
 */

import type { KpiCard, SeedRecord } from './spec.js';

export interface DomainPack {
  id: string;
  name: string;
  ctaLabel: string;
  secondaryCta: string;
  heroVerb: string;
  statusLabels: Record<string, string>;
  sectionHeadings: {
    features: string;
    howItWorks: string;
    useCases: string;
    stats: string;
  };
  featureCopy: string[];
  categories: string[];
  kpis: KpiCard[];
  seedData: SeedRecord[];
}

// ── Startup / SaaS ──────────────────────────────────────────────────────
const startup: DomainPack = {
  id: 'startup',
  name: 'Startup / SaaS',
  ctaLabel: 'Start Free Trial',
  secondaryCta: 'Book a Demo',
  heroVerb: 'Scale',
  statusLabels: { active: 'Live', pending: 'In Pipeline', completed: 'Shipped', archived: 'Deprecated' },
  sectionHeadings: { features: 'Built for Growth Teams', howItWorks: 'Launch in Minutes', useCases: 'For Every Stage', stats: 'Trusted by Innovators' },
  featureCopy: [
    'Automate your growth pipeline with smart triggers and workflows',
    'Real-time conversion tracking across every touchpoint',
    'Team collaboration with role-based access and audit logs',
    'Seamless integrations with Stripe, HubSpot, and 50+ tools',
    'Advanced analytics with cohort analysis and funnel insights',
    'AI-powered recommendations to optimize your go-to-market',
  ],
  categories: ['Growth', 'Product', 'Engineering', 'Marketing', 'Sales', 'Support'],
  kpis: [
    { label: 'MRR', value: '$48.2k', trend: '+18%', trendUp: true },
    { label: 'Active Users', value: '2,847', trend: '+24%', trendUp: true },
    { label: 'Churn Rate', value: '2.1%', trend: '-0.4%', trendUp: true },
    { label: 'NPS Score', value: '72', trend: '+5', trendUp: true },
  ],
  seedData: [
    { name: 'Enterprise Onboarding Flow', description: 'Redesign self-serve onboarding for teams 50+', status: 'active', priority: 'high', category: 'Product', value: 85000, date: '2026-03-10', assignee: 'Priya Sharma' },
    { name: 'Stripe Billing Migration', description: 'Move from legacy billing to Stripe Billing v3', status: 'active', priority: 'high', category: 'Engineering', value: 120000, date: '2026-03-08', assignee: 'Marcus Chen' },
    { name: 'Q2 Product Launch', description: 'Coordinate cross-team launch for AI features', status: 'pending', priority: 'high', category: 'Marketing', value: 45000, date: '2026-03-15', assignee: 'Sofia Martinez' },
    { name: 'Series B Deck Update', description: 'Refresh investor materials with latest metrics', status: 'completed', priority: 'medium', category: 'Growth', value: 15000, date: '2026-03-05', assignee: 'James Okafor' },
    { name: 'SOC 2 Compliance Audit', description: 'Annual security compliance certification', status: 'active', priority: 'high', category: 'Engineering', value: 65000, date: '2026-03-01', assignee: 'Elena Volkov' },
    { name: 'Customer Success Playbook', description: 'Standardize CS workflows for mid-market accounts', status: 'pending', priority: 'medium', category: 'Support', value: 22000, date: '2026-03-18', assignee: 'David Kim' },
    { name: 'PLG Funnel Optimization', description: 'A/B test signup flow to improve activation rate', status: 'active', priority: 'medium', category: 'Growth', value: 38000, date: '2026-03-12', assignee: 'Aisha Patel' },
    { name: 'API Rate Limiting v2', description: 'Implement tiered rate limits per plan level', status: 'completed', priority: 'medium', category: 'Engineering', value: 28000, date: '2026-02-28', assignee: 'Lucas Wright' },
    { name: 'Partner Channel Launch', description: 'Onboard first 10 integration partners', status: 'pending', priority: 'low', category: 'Sales', value: 55000, date: '2026-03-22', assignee: 'Nina Tanaka' },
    { name: 'Knowledge Base Revamp', description: 'Rewrite docs with interactive code examples', status: 'active', priority: 'low', category: 'Support', value: 18000, date: '2026-03-14', assignee: 'Omar Hassan' },
  ],
};

// ── Nonprofit / Social Impact ────────────────────────────────────────────
const nonprofit: DomainPack = {
  id: 'nonprofit',
  name: 'Nonprofit / Social Impact',
  ctaLabel: 'Join the Mission',
  secondaryCta: 'Learn Our Impact',
  heroVerb: 'Empower',
  statusLabels: { active: 'In Progress', pending: 'Planned', completed: 'Impact Made', archived: 'Archived' },
  sectionHeadings: { features: 'Tools for Changemakers', howItWorks: 'Making Impact Simple', useCases: 'Communities We Serve', stats: 'Our Impact So Far' },
  featureCopy: [
    'Track volunteer hours and community engagement in real time',
    'Manage donor relationships with smart CRM and reporting',
    'Plan and coordinate events with drag-and-drop scheduling',
    'Measure program outcomes with clear impact dashboards',
    'Streamline grant applications and compliance reporting',
    'Engage supporters with targeted outreach campaigns',
  ],
  categories: ['Fundraising', 'Volunteers', 'Programs', 'Outreach', 'Grants', 'Events'],
  kpis: [
    { label: 'Lives Impacted', value: '12,450', trend: '+32%', trendUp: true },
    { label: 'Active Volunteers', value: '342', trend: '+15%', trendUp: true },
    { label: 'Funds Raised', value: '$284k', trend: '+22%', trendUp: true },
    { label: 'Programs Active', value: '18', trend: '+3', trendUp: true },
  ],
  seedData: [
    { name: 'Spring Food Drive', description: 'Community food distribution across 5 neighborhoods', status: 'active', priority: 'high', category: 'Programs', value: 45000, date: '2026-03-12', assignee: 'Maria Santos' },
    { name: 'Annual Gala Planning', description: 'Flagship fundraiser targeting $150k in donations', status: 'pending', priority: 'high', category: 'Fundraising', value: 150000, date: '2026-04-20', assignee: 'David Osei' },
    { name: 'Youth Mentorship Program', description: 'Match 50 youth with professional mentors', status: 'active', priority: 'high', category: 'Programs', value: 35000, date: '2026-03-01', assignee: 'Fatima Al-Hassan' },
    { name: 'Grant Report — Ford Foundation', description: 'Year-end impact report for continued funding', status: 'completed', priority: 'high', category: 'Grants', value: 200000, date: '2026-02-28', assignee: 'Chen Wei' },
    { name: 'Volunteer Recruitment Drive', description: 'Social media campaign for summer volunteers', status: 'active', priority: 'medium', category: 'Volunteers', value: 8000, date: '2026-03-10', assignee: 'Amara Johnson' },
    { name: 'Community Health Screening', description: 'Free health checks at 3 local community centers', status: 'pending', priority: 'medium', category: 'Programs', value: 22000, date: '2026-03-25', assignee: 'Dr. Robert Kimani' },
    { name: 'Newsletter Q1 Issue', description: 'Donor newsletter with impact stories and photos', status: 'completed', priority: 'low', category: 'Outreach', value: 3000, date: '2026-03-05', assignee: 'Lily Nakamura' },
    { name: 'Clean Water Project Phase 2', description: 'Install 12 water filtration systems in rural areas', status: 'active', priority: 'high', category: 'Programs', value: 95000, date: '2026-02-15', assignee: 'James Mwangi' },
    { name: 'Board Meeting Prep', description: 'Quarterly board presentation with financials', status: 'pending', priority: 'medium', category: 'Events', value: 5000, date: '2026-03-28', assignee: 'Sarah Liu' },
    { name: 'Peer Tutoring Expansion', description: 'Expand tutoring program to 3 new schools', status: 'active', priority: 'medium', category: 'Programs', value: 28000, date: '2026-03-08', assignee: 'Andre Williams' },
  ],
};

// ── Healthcare / Wellness ────────────────────────────────────────────────
const healthcare: DomainPack = {
  id: 'healthcare',
  name: 'Healthcare / Wellness',
  ctaLabel: 'Get Started',
  secondaryCta: 'See How It Works',
  heroVerb: 'Streamline',
  statusLabels: { active: 'In Treatment', pending: 'Scheduled', completed: 'Resolved', archived: 'Discharged' },
  sectionHeadings: { features: 'Designed for Care Teams', howItWorks: 'Better Outcomes, Faster', useCases: 'Care Settings We Support', stats: 'Clinical Performance' },
  featureCopy: [
    'Track patient progress with longitudinal care timelines',
    'HIPAA-compliant data handling with end-to-end encryption',
    'Smart scheduling that reduces wait times and no-shows',
    'Clinical decision support with evidence-based protocols',
    'Team coordination across departments and specialties',
    'Outcome tracking with customizable quality metrics',
  ],
  categories: ['Primary Care', 'Cardiology', 'Mental Health', 'Rehabilitation', 'Preventive', 'Urgent Care'],
  kpis: [
    { label: 'Patients Seen', value: '1,247', trend: '+8%', trendUp: true },
    { label: 'Avg Wait Time', value: '12 min', trend: '-18%', trendUp: true },
    { label: 'Satisfaction', value: '94%', trend: '+3%', trendUp: true },
    { label: 'Follow-Up Rate', value: '87%', trend: '+5%', trendUp: true },
  ],
  seedData: [
    { name: 'Post-Op Recovery — R. Martinez', description: 'Knee replacement recovery plan, week 4 of 8', status: 'active', priority: 'high', category: 'Rehabilitation', value: 12000, date: '2026-03-10', assignee: 'Dr. Sarah Lin' },
    { name: 'Annual Wellness Check — J. Thompson', description: 'Routine physical with lab work review', status: 'completed', priority: 'medium', category: 'Preventive', value: 450, date: '2026-03-08', assignee: 'Dr. Michael Okafor' },
    { name: 'Cardiac Monitoring — A. Patel', description: 'Remote monitoring for atrial fibrillation', status: 'active', priority: 'high', category: 'Cardiology', value: 8500, date: '2026-03-05', assignee: 'Dr. Emily Chen' },
    { name: 'CBT Sessions — K. Davis', description: 'Cognitive behavioral therapy, session 6 of 12', status: 'active', priority: 'medium', category: 'Mental Health', value: 2400, date: '2026-03-12', assignee: 'Dr. James Rivera' },
    { name: 'Diabetic Management — L. Kim', description: 'A1C review and medication adjustment', status: 'pending', priority: 'high', category: 'Primary Care', value: 1200, date: '2026-03-15', assignee: 'Dr. Anna Kowalski' },
    { name: 'Physical Therapy — M. Garcia', description: 'Shoulder rehabilitation, 3x weekly', status: 'active', priority: 'medium', category: 'Rehabilitation', value: 6000, date: '2026-03-01', assignee: 'PT Rachel Brooks' },
    { name: 'Flu Vaccination Campaign', description: 'Staff and patient vaccination drive', status: 'completed', priority: 'low', category: 'Preventive', value: 15000, date: '2026-02-20', assignee: 'Nurse Amy Wong' },
    { name: 'Urgent Assessment — T. Brown', description: 'Walk-in with acute lower back pain', status: 'completed', priority: 'high', category: 'Urgent Care', value: 800, date: '2026-03-14', assignee: 'Dr. Sarah Lin' },
    { name: 'Hypertension Follow-up — D. Wilson', description: 'Blood pressure monitoring and med review', status: 'pending', priority: 'medium', category: 'Primary Care', value: 350, date: '2026-03-18', assignee: 'Dr. Michael Okafor' },
    { name: 'Group Therapy — Anxiety Module', description: 'Weekly group session, 8 participants', status: 'active', priority: 'low', category: 'Mental Health', value: 3200, date: '2026-03-09', assignee: 'Dr. James Rivera' },
  ],
};

// ── Education / Learning ─────────────────────────────────────────────────
const education: DomainPack = {
  id: 'education',
  name: 'Education / Learning',
  ctaLabel: 'Start Learning',
  secondaryCta: 'Explore Courses',
  heroVerb: 'Transform',
  statusLabels: { active: 'In Progress', pending: 'Upcoming', completed: 'Graduated', archived: 'Archived' },
  sectionHeadings: { features: 'Built for Educators', howItWorks: 'Learning Made Simple', useCases: 'For Every Learner', stats: 'Learning Outcomes' },
  featureCopy: [
    'Create engaging lessons with interactive content builders',
    'Track learner progress with real-time performance dashboards',
    'Adaptive learning paths that adjust to each student',
    'Built-in assessments with automatic grading and feedback',
    'Collaboration tools for group projects and peer review',
    'Analytics that identify at-risk students early',
  ],
  categories: ['Mathematics', 'Science', 'Language Arts', 'Technology', 'Arts', 'Professional Dev'],
  kpis: [
    { label: 'Active Learners', value: '3,842', trend: '+28%', trendUp: true },
    { label: 'Completion Rate', value: '78%', trend: '+6%', trendUp: true },
    { label: 'Avg Score', value: '84.2', trend: '+3.1', trendUp: true },
    { label: 'Courses Live', value: '47', trend: '+8', trendUp: true },
  ],
  seedData: [
    { name: 'Intro to Machine Learning', description: 'Self-paced course, 12 modules with hands-on labs', status: 'active', priority: 'high', category: 'Technology', value: 4500, date: '2026-03-10', assignee: 'Prof. Lina Park' },
    { name: 'Creative Writing Workshop', description: 'Fiction and non-fiction techniques, 6-week cohort', status: 'active', priority: 'medium', category: 'Language Arts', value: 2800, date: '2026-03-01', assignee: 'Dr. Marcus Bell' },
    { name: 'Advanced Calculus', description: 'Integration techniques and differential equations', status: 'pending', priority: 'high', category: 'Mathematics', value: 3200, date: '2026-03-15', assignee: 'Prof. Ada Obi' },
    { name: 'UX Design Fundamentals', description: 'User research, wireframing, and prototyping', status: 'active', priority: 'medium', category: 'Technology', value: 3800, date: '2026-03-08', assignee: 'Sarah Chen' },
    { name: 'Biology Lab — Genetics', description: 'Hands-on genetics experiments and analysis', status: 'completed', priority: 'medium', category: 'Science', value: 5000, date: '2026-02-28', assignee: 'Dr. James Okafor' },
    { name: 'Leadership Skills Seminar', description: 'Executive presence and team management', status: 'pending', priority: 'low', category: 'Professional Dev', value: 6500, date: '2026-03-20', assignee: 'Coach Diana Reyes' },
    { name: 'Digital Photography', description: 'Composition, lighting, and post-processing', status: 'active', priority: 'low', category: 'Arts', value: 1800, date: '2026-03-05', assignee: 'Instructor Alex Tanaka' },
    { name: 'Data Structures & Algorithms', description: 'Core CS concepts with competitive programming', status: 'active', priority: 'high', category: 'Technology', value: 4200, date: '2026-03-03', assignee: 'Prof. Lina Park' },
    { name: 'Spanish for Beginners', description: 'Conversational Spanish, A1 to A2 level', status: 'completed', priority: 'medium', category: 'Language Arts', value: 1500, date: '2026-02-20', assignee: 'Maestra Rosa Herrera' },
    { name: 'Physics — Mechanics', description: 'Newton laws, energy, and momentum applications', status: 'pending', priority: 'medium', category: 'Science', value: 3000, date: '2026-03-18', assignee: 'Prof. Raj Mehta' },
  ],
};

// ── Operations / Admin ───────────────────────────────────────────────────
const operations: DomainPack = {
  id: 'operations',
  name: 'Operations / Admin',
  ctaLabel: 'Get Organized',
  secondaryCta: 'See Features',
  heroVerb: 'Optimize',
  statusLabels: { active: 'In Progress', pending: 'Queued', completed: 'Done', archived: 'Closed' },
  sectionHeadings: { features: 'Streamline Every Workflow', howItWorks: 'Efficiency in Three Steps', useCases: 'Teams That Trust Us', stats: 'Operational Metrics' },
  featureCopy: [
    'Centralize task management with smart priority queues',
    'Automate routine workflows with customizable rules',
    'Role-based access control with detailed audit logging',
    'Document management with version control and approvals',
    'SLA tracking with automatic escalation alerts',
    'Cross-team visibility with shared dashboards and reports',
  ],
  categories: ['IT Operations', 'Facilities', 'Procurement', 'HR', 'Compliance', 'Finance'],
  kpis: [
    { label: 'Tasks Completed', value: '847', trend: '+14%', trendUp: true },
    { label: 'Avg Resolution', value: '2.3 hrs', trend: '-22%', trendUp: true },
    { label: 'SLA Compliance', value: '96.8%', trend: '+1.2%', trendUp: true },
    { label: 'Open Tickets', value: '23', trend: '-35%', trendUp: true },
  ],
  seedData: [
    { name: 'Server Room HVAC Maintenance', description: 'Quarterly cooling system inspection and filter replacement', status: 'pending', priority: 'high', category: 'Facilities', value: 8500, date: '2026-03-15', assignee: 'Mike Torres' },
    { name: 'Q1 Budget Reconciliation', description: 'Match actuals to forecasts across all departments', status: 'active', priority: 'high', category: 'Finance', value: 0, date: '2026-03-10', assignee: 'Angela Wei' },
    { name: 'New Hire Onboarding — 5 Employees', description: 'Equipment provisioning, accounts, and orientation', status: 'active', priority: 'high', category: 'HR', value: 12000, date: '2026-03-08', assignee: 'Lisa Ndongo' },
    { name: 'Software License Audit', description: 'Review and optimize SaaS subscriptions, find savings', status: 'active', priority: 'medium', category: 'IT Operations', value: 45000, date: '2026-03-01', assignee: 'Raj Kapoor' },
    { name: 'GDPR Compliance Review', description: 'Annual data protection compliance assessment', status: 'pending', priority: 'high', category: 'Compliance', value: 25000, date: '2026-03-20', assignee: 'Dr. Eva Schneider' },
    { name: 'Office Supply Restock', description: 'Quarterly bulk order for all 3 office locations', status: 'completed', priority: 'low', category: 'Procurement', value: 3200, date: '2026-03-05', assignee: 'Carlos Mendez' },
    { name: 'VPN Configuration Update', description: 'Migrate from legacy VPN to zero-trust access', status: 'active', priority: 'medium', category: 'IT Operations', value: 18000, date: '2026-03-12', assignee: 'Raj Kapoor' },
    { name: 'Fire Safety Inspection', description: 'Annual fire safety audit and extinguisher checks', status: 'completed', priority: 'medium', category: 'Facilities', value: 4500, date: '2026-02-28', assignee: 'Mike Torres' },
    { name: 'Vendor Contract Renewals', description: 'Negotiate renewals for 8 service contracts', status: 'pending', priority: 'medium', category: 'Procurement', value: 180000, date: '2026-03-25', assignee: 'Angela Wei' },
    { name: 'Employee Satisfaction Survey', description: 'Anonymous quarterly survey and results analysis', status: 'active', priority: 'low', category: 'HR', value: 2000, date: '2026-03-14', assignee: 'Lisa Ndongo' },
  ],
};

// ── Creator / Media ──────────────────────────────────────────────────────
const creator: DomainPack = {
  id: 'creator',
  name: 'Creator / Media',
  ctaLabel: 'Start Creating',
  secondaryCta: 'View Examples',
  heroVerb: 'Amplify',
  statusLabels: { active: 'In Production', pending: 'Scheduled', completed: 'Published', archived: 'Archived' },
  sectionHeadings: { features: 'Your Creative Command Center', howItWorks: 'From Idea to Audience', useCases: 'Creators Who Ship', stats: 'Creator Metrics' },
  featureCopy: [
    'Plan and schedule content across all your channels',
    'Manage guest outreach with smart follow-up automation',
    'Track audience growth and engagement analytics',
    'Asset management with tagging, search, and versioning',
    'Collaboration tools for editors, designers, and writers',
    'Revenue tracking across sponsorships, merch, and subscriptions',
  ],
  categories: ['Video', 'Podcast', 'Blog', 'Social Media', 'Newsletter', 'Sponsorships'],
  kpis: [
    { label: 'Total Reach', value: '284k', trend: '+42%', trendUp: true },
    { label: 'Episodes Live', value: '128', trend: '+6', trendUp: true },
    { label: 'Engagement Rate', value: '6.8%', trend: '+0.9%', trendUp: true },
    { label: 'Revenue', value: '$18.4k', trend: '+28%', trendUp: true },
  ],
  seedData: [
    { name: 'Interview — Sarah Chen (AI Ethics)', description: 'Record 45-min episode on responsible AI development', status: 'active', priority: 'high', category: 'Podcast', value: 2500, date: '2026-03-12', assignee: 'Producer Jay Park' },
    { name: 'YouTube Series — Ep. 14', description: 'Script, shoot, and edit tutorial on Figma plugins', status: 'active', priority: 'high', category: 'Video', value: 4200, date: '2026-03-10', assignee: 'Editor Maya Lopez' },
    { name: 'Brand Partnership — TechFlow', description: 'Sponsored segment for next 3 episodes', status: 'pending', priority: 'high', category: 'Sponsorships', value: 15000, date: '2026-03-18', assignee: 'Biz Dev Alex Kim' },
    { name: 'Weekly Newsletter #47', description: 'Curate top 5 tools + personal essay on burnout', status: 'completed', priority: 'medium', category: 'Newsletter', value: 800, date: '2026-03-08', assignee: 'Writer Sam Okafor' },
    { name: 'Instagram Reel — Behind the Scenes', description: 'Quick 30s reel showing studio setup', status: 'active', priority: 'low', category: 'Social Media', value: 300, date: '2026-03-14', assignee: 'Social Mgr Zoe Tanaka' },
    { name: 'Blog Post — 2026 Creator Economy', description: 'Long-form analysis with data visualizations', status: 'pending', priority: 'medium', category: 'Blog', value: 1500, date: '2026-03-20', assignee: 'Writer Sam Okafor' },
    { name: 'Guest Pitch — Marc Randolph', description: 'Outreach email for Netflix co-founder interview', status: 'pending', priority: 'high', category: 'Podcast', value: 5000, date: '2026-03-22', assignee: 'Producer Jay Park' },
    { name: 'Thumbnail A/B Test', description: 'Test 3 thumbnail styles for recent video series', status: 'active', priority: 'medium', category: 'Video', value: 200, date: '2026-03-11', assignee: 'Designer Mia Chen' },
    { name: 'Twitter Thread — Top Takeaways', description: 'Thread from latest episode with key quotes', status: 'completed', priority: 'low', category: 'Social Media', value: 100, date: '2026-03-09', assignee: 'Social Mgr Zoe Tanaka' },
    { name: 'Merch Drop — Limited Tees', description: 'Design, production, and Shopify listing for 200 units', status: 'active', priority: 'medium', category: 'Sponsorships', value: 6000, date: '2026-03-06', assignee: 'Ops Lead Dana Rivera' },
  ],
};

// ── Pack Registry ────────────────────────────────────────────────────────
const PACKS: Record<string, DomainPack> = { startup, nonprofit, healthcare, education, operations, creator };

const DOMAIN_PACK_KEYWORDS: Record<string, string[]> = {
  startup: ['startup', 'saas', 'launch', 'growth', 'mrr', 'arr', 'churn', 'conversion', 'b2b', 'product-led', 'go-to-market', 'fundrais', 'investor', 'venture', 'series'],
  nonprofit: ['nonprofit', 'non-profit', 'charity', 'volunteer', 'donation', 'donor', 'social impact', 'community', 'ngo', 'mission', 'humanitarian', 'advocacy', 'philanthropy', 'foundation', 'grant', 'outreach', 'food bank', 'shelter', 'cleanup'],
  healthcare: ['health', 'medical', 'patient', 'clinical', 'hospital', 'wellness', 'therapy', 'doctor', 'nurse', 'care plan', 'treatment', 'diagnosis', 'telehealth', 'pharmacy', 'fitness', 'workout', 'nutrition', 'mental health'],
  education: ['education', 'learning', 'course', 'student', 'teacher', 'lesson', 'curriculum', 'school', 'university', 'tutoring', 'training', 'quiz', 'exam', 'enrollment', 'grading', 'classroom', 'academic'],
  operations: ['operations', 'admin', 'workflow', 'compliance', 'inventory', 'procurement', 'facilities', 'hr', 'human resources', 'ticketing', 'helpdesk', 'it ', 'maintenance', 'logistics', 'supply chain', 'warehouse'],
  creator: ['creator', 'podcast', 'youtube', 'content', 'media', 'film', 'video', 'blog', 'newsletter', 'influencer', 'audience', 'channel', 'episode', 'subscriber', 'publishing', 'editorial', 'journalist'],
};

/**
 * Select a domain pack from prompt keywords. Returns null if no strong match.
 */
export function getDomainPack(prompt: string): DomainPack | null {
  const lower = prompt.toLowerCase();
  let bestPack: string | null = null;
  let bestScore = 0;

  for (const [packId, keywords] of Object.entries(DOMAIN_PACK_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPack = packId;
    }
  }

  if (bestPack && bestScore >= 1) {
    return PACKS[bestPack];
  }
  return null;
}

/**
 * Get a domain pack by ID directly.
 */
export function getDomainPackById(id: string): DomainPack | null {
  return PACKS[id] || null;
}

/**
 * List all available domain pack IDs.
 */
export function listDomainPacks(): string[] {
  return Object.keys(PACKS);
}
