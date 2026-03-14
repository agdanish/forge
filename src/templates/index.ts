/**
 * Scaffold hints injected into the system prompt based on job keywords.
 * These guide the LLM toward the best app structure for common prompt types.
 * 14 archetypes covering ~95% of possible mystery prompts.
 */

interface ScaffoldHint {
  keywords: string[];
  name: string;
  hint: string;
}

const SCAFFOLDS: ScaffoldHint[] = [
  {
    name: "saas-dashboard",
    keywords: ["dashboard", "admin", "saas", "crm", "management", "panel", "monitor", "overview", "control"],
    hint: `ARCHETYPE: SaaS Dashboard — sidebar nav + metric cards + data table.
STRUCTURE (10 files, App.tsx holds all state):
- Collapsible sidebar with nav links + lucide icons + active state highlight
- Top header: breadcrumb + notification bell + user avatar dropdown
- 4 KPI stat cards: icon + big number + trend arrow (↑12%) + label
- Data table with sortable columns + search filter + status badges
- Quick-action modal (add/edit record)
MUST HAVE: Real data (10+ rows), working search, tab switching between sections.
DESIGN: Gradient header "from-indigo-600 to-purple-600", card hover lift effect.`,
  },
  {
    name: "analytics",
    keywords: ["analytics", "chart", "graph", "report", "data", "visualization", "insight", "statistic", "metric", "bi"],
    hint: `ARCHETYPE: Analytics/Data Visualization — charts + KPIs + filters.
STRUCTURE (10 files, all in App.tsx + optional components.tsx):
- Date range selector (Last 7d / 30d / 90d / Custom) that re-renders data
- 4 KPI summary cards with big numbers + percentage change + sparkline
- Bar chart using pure Tailwind (divs with height as inline style %)
- Line chart trend using SVG polyline (simple, no library)
- Breakdown table with color-coded rows + export CSV button (generates blob)
MUST HAVE: Toggle between chart types, real-looking numbers, working filters.
DESIGN: Dark bg-gray-950, neon indigo/purple accent lines on charts.`,
  },
  {
    name: "crud-tool",
    keywords: ["crud", "manage", "form", "task", "todo", "note", "item", "list", "record", "entry", "tracker"],
    hint: `ARCHETYPE: CRUD Tool — list + add/edit/delete + search/filter.
STRUCTURE (10 files, all logic in App.tsx):
- Header: app name + "Add New" button (opens inline form or modal)
- Search bar + filter dropdowns (category, status, date) that work in real-time
- Item cards/rows with title, metadata, status badge, edit + delete buttons
- Inline edit form (expands on click, no page navigation)
- Confirmation toast on create/edit/delete ("Saved!" green banner)
- Empty state with icon + "No items yet" + "Create your first" CTA
MUST HAVE: 10+ seed items, all CRUD operations mutate state, search filters live.
DESIGN: Card list on left, detail panel on right (master-detail layout).`,
  },
  {
    name: "ai-chat",
    keywords: ["chat", "conversation", "message", "assistant", "bot", "ai", "gpt", "llm", "copilot", "agent"],
    hint: `ARCHETYPE: AI Chat Interface — message thread + input + sidebar history.
STRUCTURE (10 files, all in App.tsx):
- Left sidebar: conversation history list (click to switch) + "New Chat" button
- Main area: scrollable message thread (auto-scroll to bottom on new message)
- User messages: right-aligned, indigo bg, rounded-tl-sm
- AI messages: left-aligned, gray-800 bg, avatar icon, rounded-tr-sm, typing animation
- Bottom input: textarea (Enter to send, Shift+Enter newline) + send button
- Suggested prompts grid (4 examples shown on empty conversation)
- Model selector dropdown in header (GPT-4o / Claude / Gemini labels)
MUST HAVE: Mock AI responses that vary by keyword, message timestamps, token count display.
DESIGN: ChatGPT-like split layout, streaming dots animation on "thinking".`,
  },
  {
    name: "productivity-kanban",
    keywords: ["kanban", "board", "workflow", "sprint", "agile", "scrum", "backlog", "column", "swim"],
    hint: `ARCHETYPE: Kanban Board — drag-and-drop columns + task cards.
STRUCTURE (10 files):
- 3-4 columns: Todo / In Progress / Review / Done (each column scrollable)
- Task cards: title + assignee avatar + priority badge (High/Med/Low) + due date
- "Add Task" button per column (inline form appears at bottom of column)
- Click card → detail side panel slides in (title, description, checklist, comments)
- Column header shows task count badge
- Top bar: search + filter by assignee + filter by priority
MUST HAVE: Move tasks between columns (click card → change status dropdown), 8+ seed tasks, working add form.
DESIGN: Each column slightly different shade, priority colors (red/yellow/green), card hover shadow lift.`,
  },
  {
    name: "ecommerce",
    keywords: ["shop", "store", "product", "cart", "buy", "sell", "marketplace", "listing", "catalog", "inventory", "ecommerce", "commerce"],
    hint: `ARCHETYPE: E-Commerce Store — product grid + cart + checkout.
STRUCTURE (10 files):
- Header: logo + search bar + cart icon with badge (item count)
- Product grid (3 cols): image placeholder (colored div) + name + price + rating stars + "Add to Cart"
- Cart sidebar (slides in): item list + quantity controls +/- + remove + subtotal + "Checkout" button
- Category filter tabs (All / Electronics / Fashion / Home / etc.)
- Product detail modal on click: larger image + description + size/color selector + add to cart
- Search that filters products by name in real-time
MUST HAVE: 12+ products with real names/prices, cart persists in state, quantity updates total.
DESIGN: Clean white/light mode variant OR dark premium — gradient hero banner at top.`,
  },
  {
    name: "finance",
    keywords: ["budget", "expense", "finance", "money", "invoice", "billing", "payment", "cost", "salary", "income", "spend", "accounting", "wallet", "transaction"],
    hint: `ARCHETYPE: Finance/Budget Tracker — transactions + categories + summary.
STRUCTURE (10 files):
- Summary bar: Total Income (green) + Total Expenses (red) + Net Balance (blue/white)
- Donut/pie chart (CSS clip-path or conic-gradient) showing spending by category
- Transaction list: date + merchant + category chip + amount (green +/red -)
- Add Transaction form: amount + category dropdown + description + date
- Category breakdown table: category name + total + % of spending + bar indicator
- Filter: date range + category + type (income/expense)
MUST HAVE: 15+ seed transactions, working add form, live recalculation of totals.
DESIGN: Green for income (text-emerald-400), Red for expenses (text-red-400), indigo accent.`,
  },
  {
    name: "social-feed",
    keywords: ["social", "community", "feed", "post", "profile", "follow", "friend", "network", "tweet", "share", "like", "comment"],
    hint: `ARCHETYPE: Social Feed / Community — posts + interactions + profile.
STRUCTURE (10 files):
- Left sidebar: user profile card (avatar + name + stats: followers/following/posts) + nav links
- Main feed: post cards with avatar + username + timestamp + content + image placeholder
- Post interactions: Like (toggle heart, count updates) + Comment (expand thread) + Share button
- Create Post box at top of feed (textarea + Post button)
- Right sidebar: "Trending" tags list + "Suggested Users" list
- Profile header if viewing profile: banner + avatar + bio + follow button
MUST HAVE: 8+ seed posts, like toggle mutates count, comment adds to list, create post prepends to feed.
DESIGN: Clean card layout, hover states on interactive elements, unread notification badge.`,
  },
  {
    name: "health-fitness",
    keywords: ["health", "fitness", "workout", "exercise", "nutrition", "diet", "calories", "medical", "wellness", "gym", "run", "training", "habit"],
    hint: `ARCHETYPE: Health/Fitness Tracker — workouts + progress + streaks.
STRUCTURE (10 files):
- Today's summary: calories burned ring + steps progress bar + water intake tracker
- Workout log: exercise name + sets/reps/weight + duration + intensity badge
- Weekly calendar strip: M T W T F S S with checkmarks for completed days (streak counter)
- Add Workout form: exercise search/select + sets/reps inputs + timer start button
- Progress charts: weight over time (SVG line) + PR (personal record) achievements
- Nutrition tab: macros (protein/carbs/fat) progress bars + meal log
MUST HAVE: 7-day seed data, working add form, streak counter updates, progress visually responds.
DESIGN: Energetic — indigo + emerald accents, circular progress rings using SVG stroke-dasharray.`,
  },
  {
    name: "education",
    keywords: ["education", "learning", "course", "quiz", "study", "flashcard", "school", "teach", "lesson", "curriculum", "student", "exam", "test"],
    hint: `ARCHETYPE: Education/Learning Platform — courses + progress + quiz.
STRUCTURE (10 files):
- Course grid: thumbnail (colored gradient div) + title + instructor + progress bar + difficulty badge
- Course detail: module list (accordion expand) + lesson items (checkmark to complete)
- Quiz component: question + 4 answer options (radio) + Submit + next + score display
- Progress dashboard: overall completion % + XP points + streak + achievements badges
- Flashcard mode: card flip animation (CSS transform rotateY) + next/prev + mark known
- Search + filter by category/difficulty/duration
MUST HAVE: 6+ courses, quiz actually scores correctly, progress persists in state during session.
DESIGN: Warm palette — amber/orange accents for gamification, clean readable typography.`,
  },
  {
    name: "calendar-events",
    keywords: ["calendar", "event", "schedule", "appointment", "booking", "meeting", "reminder", "planner", "agenda", "reservation"],
    hint: `ARCHETYPE: Calendar/Event Planner — monthly grid + event management.
STRUCTURE (10 files):
- Monthly calendar grid (7 cols × 5-6 rows) with today highlighted
- Events shown as colored chips on calendar cells (click to view detail)
- Sidebar: upcoming events list (next 5) + mini month navigator
- Add Event modal: title + date + time + category color + description + duration
- Day view: clicking a date shows that day's events in detail panel
- Category color coding: Work (blue) / Personal (green) / Health (red) / Social (purple)
MUST HAVE: 10+ seed events across current month, add form creates event on calendar, navigation between months.
DESIGN: Clean white calendar cells on dark bg, event chips with category colors.`,
  },
  {
    name: "portfolio-showcase",
    keywords: ["portfolio", "showcase", "gallery", "resume", "cv", "work", "personal", "profile", "website", "landing", "agency"],
    hint: `ARCHETYPE: Portfolio/Showcase — hero + projects + contact.
STRUCTURE (10 files, single page with scroll sections):
- Hero: large gradient heading + subtitle + CTA buttons + floating skill badges
- About section: photo placeholder + bio text + skills grid (icons + labels)
- Projects grid: project cards with preview image (gradient placeholder) + title + tech stack badges + Live/Code links
- Experience timeline: vertical line + company nodes with role + dates + bullet achievements
- Skills visualization: grouped by category with proficiency bars
- Contact section: form (name + email + message + Send) + social links
MUST HAVE: 4+ projects, 6+ skills, experience timeline, contact form validates + shows success state.
DESIGN: Dramatic — full-width sections, parallax-style gradients, smooth scroll behavior.`,
  },
  {
    name: "game-quiz",
    keywords: ["game", "quiz", "trivia", "puzzle", "score", "leaderboard", "challenge", "play", "level", "word", "memory"],
    hint: `ARCHETYPE: Game/Quiz App — gameplay + scoring + leaderboard.
STRUCTURE (10 files):
- Start screen: title + difficulty selector + "Start Game" button + high score display
- Game screen: question/challenge area + answer input or multiple choice
- Score/progress: points counter (animates on score) + timer countdown bar + lives/hearts
- Results screen: final score + percentage + "Play Again" + share score button
- Leaderboard: top 10 scores table with rank + name + score + date
- Category selector (if applicable): Sports / Science / History / etc.
MUST HAVE: 10+ questions/levels, timer actually counts down, score calculates correctly, game over on wrong answer (or lives depleted).
DESIGN: Playful — bold colors, big typography, animation on correct answer (pulse/bounce), wrong answer shake.`,
  },
  {
    name: "real-estate",
    keywords: ["real estate", "property", "house", "apartment", "rent", "mortgage", "listing", "realty", "home", "flat"],
    hint: `ARCHETYPE: Real Estate Listings — property grid + filters + detail.
STRUCTURE (10 files):
- Map placeholder (styled div with grid overlay) + listings panel side-by-side
- Property cards: image placeholder (gradient) + price + beds/baths/sqft icons + address + status badge
- Advanced filters: price range slider + bedrooms + property type + amenities checkboxes
- Property detail modal: photo gallery placeholder + full description + features list + agent card + contact button
- Favorites toggle (heart icon) + saved properties sidebar
- Sort: Price ↑↓ / Newest / Most Popular
MUST HAVE: 10+ seed properties with real addresses/prices, filters update grid live, favorites toggle persists in state.
DESIGN: Clean and professional — trust-inspiring white cards, emerald accents for "For Sale", blue for "For Rent".`,
  },
];

const DEFAULT_HINT = `ARCHETYPE: Unknown/Custom — build the most complete, functional interpretation possible.

WINNING STRATEGY for unknown prompts (this is what separates $10K winners from also-rans):

Step 1: Extract the CORE NOUN from the prompt. Every prompt has one.
  "Build a cosmic ray detector" → cosmic rays. "Make something for librarians" → books/library.
  "Create a vibe engine" → vibes. Even abstract prompts have a subject.

Step 2: Build a 4-panel management app for that noun:
  A) COLLECTION VIEW — grid/list of items with search bar + category filter tabs + sort dropdown
  B) DETAIL PANEL — click item → side panel with all attributes, edit form, status actions
  C) DASHBOARD — 4 KPI cards (total count, active %, top category, trend) + bar chart breakdown
  D) CRUD — Add New modal (5+ fields), inline edit, delete with confirmation, status toggle

Step 3: Seed with 12+ REALISTIC items using DOMAIN-SPECIFIC terminology.
  NOT "Item 1, Item 2" — use real names, dates, categories from the domain.
  A beekeeping app: "Spring Inspection - Hive #3", "Queen spotted, 8 frames brood".
  A space app: "Artemis IV", "Mars orbit insertion", "Crew: 4, Duration: 687 days".

Step 4: Add 3 domain-specific features that prove you UNDERSTOOD the prompt:
  For cooking: ingredient checklist, serving size adjuster, cook timer
  For music: BPM display, key signature selector, waveform visualization (CSS)
  For fitness: rep counter, rest timer, personal record badges

FULL STRUCTURE (keep to 2-3 create_file calls):
- Collapsible sidebar: nav links with lucide icons + active highlight + user card at bottom
- Top bar: search (⌘K hint) + "Add New" CTA button + notification bell
- Main: dashboard view (default) | list view | board view (tab switch between them)
- 4 KPI cards with trend arrows (↑12% green / ↓3% red)
- Sortable data table OR card grid with status badges + priority colors
- Detail side panel on click: all fields + progress bar + action buttons
- Add/Edit modal: 5+ typed form fields + category dropdown + priority select
- Working search that filters in real-time
- Category filter tabs (All + 4-6 domain categories)
- Toast notification on create/edit/delete

DESIGN: Dark premium (bg-gray-950), gradient heading text (indigo→purple), gray-900 cards, indigo-600 primary buttons.
ICONS: Use domain-relevant lucide icons. Every nav item and KPI card gets an icon.

CRITICAL: Ship a WORKING app with real interactions. A polished management tool scores 7-8/10.
An ambitious but broken creative interpretation scores 3/10. FUNCTIONALITY WINS.`;

/**
 * Get the most relevant scaffold hint for a given job prompt.
 * Returns a hint string to inject into the system prompt.
 * Uses keyword scoring to find best match across 14 archetypes.
 */
export function getScaffoldHint(prompt: string): string {
  const lower = prompt.toLowerCase();

  // Score each scaffold by keyword matches (more matches = better fit)
  let bestMatch: ScaffoldHint | null = null;
  let bestScore = 0;

  for (const scaffold of SCAFFOLDS) {
    const score = scaffold.keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = scaffold;
    }
  }

  if (bestMatch && bestScore > 0) {
    return `\n## SCAFFOLD HINT (${bestMatch.name} — matched ${bestScore} keyword${bestScore > 1 ? 's' : ''})\n${bestMatch.hint}\n`;
  }

  return `\n## SCAFFOLD HINT (custom — no keyword match, use default strategy)\n${DEFAULT_HINT}\n`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _noop = (_msg: string) => {};

export default getScaffoldHint;
