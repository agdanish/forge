/**
 * Typed AppSpec schema for structured app generation.
 * The LLM produces ONLY this compact JSON — no full code.
 * The shell renderer then compiles it into a complete React app.
 */

import { getDomainPack } from './domainPacks.js';

export interface SeedRecord {
  name: string;
  description: string;
  status: 'active' | 'pending' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low';
  category: string;
  value: number;
  date: string;
  assignee: string;
}

export interface KpiCard {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
}

export interface AppSpec {
  appName: string;
  tagline: string;
  domain: string;
  primaryEntity: string;       // e.g. "Task", "Product", "Patient"
  primaryEntityPlural: string; // e.g. "Tasks", "Products", "Patients"
  primaryAction: string;       // e.g. "Track", "Manage", "Analyze"
  shell: 'universal' | 'dashboard' | 'landing';
  theme: 'neutral-dark' | 'fintech-dark' | 'creator-dark' | 'health-light' | 'education-light' | 'neutral-light';
  categories: string[];        // 6-10 categories for filtering
  kpis: KpiCard[];            // 4 KPI cards
  seedData: SeedRecord[];     // 10-12 seed records
  views: string[];            // e.g. ["Dashboard", "List", "Board"]
}

/**
 * Prompt sent to LLM to extract a structured AppSpec from the job prompt.
 * This is a COMPACT call — no tools, no code generation.
 */
export function getSpecExtractionPrompt(jobPrompt: string): string {
  return `You are a product architect. Given a job prompt, output ONLY a valid JSON object matching this exact schema. No explanation, no markdown, ONLY the JSON.

Job prompt: "${jobPrompt}"

Schema:
{
  "appName": "string (creative 2-3 word app name)",
  "tagline": "string (one sentence describing the app)",
  "domain": "string (e.g. Finance, Health, Education, E-Commerce, etc.)",
  "primaryEntity": "string (singular, e.g. Task, Product, Patient)",
  "primaryEntityPlural": "string (plural, e.g. Tasks, Products, Patients)",
  "primaryAction": "string (verb, e.g. Track, Manage, Analyze, Shop)",
  "shell": "universal" or "dashboard" or "landing",
  "theme": one of: "neutral-dark", "fintech-dark", "creator-dark", "health-light", "education-light", "neutral-light",
  "categories": ["string array of 6-8 categories relevant to the domain"],
  "kpis": [
    {"label": "string", "value": "string (number or formatted)", "trend": "+N%", "trendUp": true/false}
  ] (exactly 4 KPI cards),
  "seedData": [
    {
      "name": "string (realistic item name)",
      "description": "string (one sentence)",
      "status": "active" | "pending" | "completed" | "archived",
      "priority": "high" | "medium" | "low",
      "category": "string (from categories array)",
      "value": number (dollars or relevant metric),
      "date": "YYYY-MM-DD",
      "assignee": "string (realistic full name)"
    }
  ] (exactly 10 records, mix of statuses and priorities),
  "views": ["Dashboard", "List", "Board"] (2-3 view names, or for landing shell: ["Features", "Pricing", "FAQ"])
}

Rules:
- appName must be catchy and domain-specific (not generic)
- All seed data must use realistic names, dates, and numbers
- Categories must be relevant to the specific domain
- KPI values must be realistic for the domain
- Choose theme based on domain: fintech-dark for finance, health-light for health, education-light for education, neutral-dark for tech/general, creator-dark for creative, neutral-light for consumer/social
- Choose shell "dashboard" for analytics/metrics-heavy prompts, "landing" for landing pages/product showcases/startup launches/marketing pages/portfolios/homepages, "universal" for everything else

Return ONLY the JSON object. No other text.`;
}

/**
 * Parse and validate an AppSpec from LLM output.
 * Returns a valid spec or null if parsing fails.
 */
export function parseAppSpec(raw: string): AppSpec | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as AppSpec;

    // Validate required fields
    if (!parsed.appName || !parsed.domain || !parsed.primaryEntity) return null;
    if (!parsed.categories || parsed.categories.length < 3) return null;
    if (!parsed.seedData || parsed.seedData.length < 5) return null;
    if (!parsed.kpis || parsed.kpis.length < 3) return null;

    // Enforce defaults
    parsed.shell = parsed.shell || 'universal';
    parsed.theme = parsed.theme || 'neutral-dark';
    parsed.primaryEntityPlural = parsed.primaryEntityPlural || parsed.primaryEntity + 's';
    parsed.primaryAction = parsed.primaryAction || 'Manage';
    parsed.tagline = parsed.tagline || `${parsed.primaryAction} your ${parsed.primaryEntityPlural.toLowerCase()} efficiently`;
    parsed.views = parsed.views || ['Dashboard', 'List', 'Board'];

    // Bound seed data
    if (parsed.seedData.length > 15) parsed.seedData = parsed.seedData.slice(0, 12);

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Generate a fallback AppSpec deterministically when LLM extraction fails.
 */
export function generateFallbackSpec(prompt: string): AppSpec {
  const lower = prompt.toLowerCase();

  // Detect shell type from prompt keywords
  const landingKeywords = ['landing', 'showcase', 'homepage', 'home page', 'product page', 'launch', 'startup', 'campaign', 'marketing', 'portfolio', 'company website', 'saas', 'coming soon', 'waitlist', 'promo', 'brand', 'explainer', 'pitch'];
  const dashboardKeywords = ['dashboard', 'analytics', 'insights', 'reporting', 'metrics', 'monitor', 'statistics', 'kpi', 'overview', 'report'];
  // Additional: "product" or "platform" + showcase-like context → landing
  const hasShowcaseContext = ['product', 'platform', 'solution', 'service'].some(k => lower.includes(k)) && ['for', 'that helps', 'to help', 'designed', 'built for', 'page', 'website', 'site'].some(k => lower.includes(k));
  const hasDashboardKeyword = dashboardKeywords.some(k => lower.includes(k));
  const hasLandingKeyword = landingKeywords.some(k => lower.includes(k)) || hasShowcaseContext;
  // Dashboard keyword is explicit intent — takes priority when both present
  const isDashboard = hasDashboardKeyword;
  const isLanding = !isDashboard && hasLandingKeyword;

  // Expanded entity detection with synonyms
  const entityMap: Record<string, [string, string, string]> = {
    task: ['Task', 'Tasks', 'Project Management'],
    product: ['Product', 'Products', 'E-Commerce'],
    patient: ['Patient', 'Patients', 'Healthcare'],
    student: ['Student', 'Students', 'Education'],
    expense: ['Expense', 'Expenses', 'Finance'],
    contact: ['Contact', 'Contacts', 'CRM'],
    event: ['Event', 'Events', 'Event Planning'],
    recipe: ['Recipe', 'Recipes', 'Cooking'],
    workout: ['Workout', 'Workouts', 'Fitness'],
    property: ['Property', 'Properties', 'Real Estate'],
    order: ['Order', 'Orders', 'E-Commerce'],
    ticket: ['Ticket', 'Tickets', 'Support'],
    project: ['Project', 'Projects', 'Project Management'],
    course: ['Course', 'Courses', 'Education'],
    invoice: ['Invoice', 'Invoices', 'Finance'],
    // Extended synonyms
    submission: ['Submission', 'Submissions', 'Workflow'],
    routine: ['Routine', 'Routines', 'Productivity'],
    volunteer: ['Volunteer', 'Volunteers', 'Community'],
    rescue: ['Case', 'Cases', 'Wildlife'],
    vendor: ['Vendor', 'Vendors', 'Marketplace'],
    podcast: ['Episode', 'Episodes', 'Media'],
    guest: ['Guest', 'Guests', 'Outreach'],
    campaign: ['Campaign', 'Campaigns', 'Marketing'],
    booking: ['Booking', 'Bookings', 'Scheduling'],
    membership: ['Member', 'Members', 'Community'],
    inventory: ['Item', 'Items', 'Inventory'],
    lead: ['Lead', 'Leads', 'Sales'],
    applicant: ['Applicant', 'Applicants', 'Recruitment'],
    donation: ['Donation', 'Donations', 'Nonprofit'],
    shipment: ['Shipment', 'Shipments', 'Logistics'],
    asset: ['Asset', 'Assets', 'Operations'],
    appointment: ['Appointment', 'Appointments', 'Scheduling'],
    initiative: ['Initiative', 'Initiatives', 'Impact'],
    tool: ['Tool', 'Tools', 'Workspace'],
    tracker: ['Item', 'Items', 'Tracking'],
    manager: ['Item', 'Items', 'Management'],
    planner: ['Plan', 'Plans', 'Planning'],
  };

  let entity = 'Item', plural = 'Items', domain = 'Workspace';
  for (const [kw, [e, p, d]] of Object.entries(entityMap)) {
    if (lower.includes(kw)) { entity = e; plural = p; domain = d; break; }
  }

  // Extract a name from prompt
  const nameMatch = prompt.match(/(?:build|create|make)\s+(?:a\s+|an\s+)?([\w\s]{3,30}?)(?:\s+app|\s+tool|\s+with|\s+that|$)/i);
  const appName = nameMatch
    ? nameMatch[1].trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : `${domain} Hub`;

  const detectedShell = isLanding ? 'landing' as const : isDashboard ? 'dashboard' as const : 'universal' as const;

  // Try to apply a domain pack for realistic content
  const pack = getDomainPack(prompt);
  const action = pack?.heroVerb || (isLanding ? 'Discover' : isDashboard ? 'Analyze' : 'Manage');

  return {
    appName,
    tagline: isLanding
      ? `The modern ${domain.toLowerCase()} platform that helps teams ${action.toLowerCase()} ${plural.toLowerCase()} smarter`
      : `${action} your ${plural.toLowerCase()} efficiently and beautifully`,
    domain,
    primaryEntity: entity,
    primaryEntityPlural: plural,
    primaryAction: action,
    shell: detectedShell,
    theme: 'neutral-dark',
    categories: pack?.categories || ['General', 'Priority', 'Active', 'Review', 'Archive', 'Other'],
    kpis: pack?.kpis || [
      { label: `Total ${plural}`, value: '12', trend: '+12%', trendUp: true },
      { label: 'Active', value: '5', trend: '+8%', trendUp: true },
      { label: 'Completed', value: '4', trend: '+24%', trendUp: true },
      { label: 'Total Value', value: '$95k', trend: '-3%', trendUp: false },
    ],
    seedData: pack?.seedData || [
      { name: 'Strategic Review', description: 'Q2 strategic planning and review', status: 'active', priority: 'high', category: 'Priority', value: 45000, date: '2026-03-15', assignee: 'Sarah Chen' },
      { name: 'Market Analysis', description: 'Competitive analysis report', status: 'completed', priority: 'high', category: 'Review', value: 28000, date: '2026-03-12', assignee: 'James Wilson' },
      { name: 'Launch Campaign', description: 'Multi-channel launch strategy', status: 'active', priority: 'high', category: 'Active', value: 67000, date: '2026-03-18', assignee: 'Maria Garcia' },
      { name: 'User Feedback', description: 'Incorporate Q1 survey results', status: 'pending', priority: 'medium', category: 'General', value: 15000, date: '2026-03-20', assignee: 'Alex Kim' },
      { name: 'Budget Review', description: 'Reduce costs by 15%', status: 'active', priority: 'medium', category: 'Priority', value: 120000, date: '2026-03-10', assignee: 'David Brown' },
      { name: 'Team Training', description: 'Upskill on new technologies', status: 'pending', priority: 'medium', category: 'Active', value: 32000, date: '2026-03-25', assignee: 'Lisa Zhang' },
      { name: 'System Upgrade', description: 'Cloud migration planning', status: 'active', priority: 'high', category: 'Priority', value: 95000, date: '2026-03-08', assignee: 'Tom Anderson' },
      { name: 'Partner Agreement', description: 'Finalize strategic alliance', status: 'completed', priority: 'high', category: 'Review', value: 250000, date: '2026-03-05', assignee: 'Sarah Chen' },
      { name: 'QA Overhaul', description: 'Automated testing pipeline', status: 'pending', priority: 'low', category: 'Archive', value: 42000, date: '2026-03-28', assignee: 'James Wilson' },
      { name: 'Onboarding Flow', description: 'Redesign user journey', status: 'active', priority: 'medium', category: 'Active', value: 38000, date: '2026-03-22', assignee: 'Maria Garcia' },
    ],
    views: isLanding ? ['Features', 'Pricing', 'FAQ'] : ['Dashboard', 'List', 'Board'],
  };
}
