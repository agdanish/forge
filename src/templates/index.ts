/**
 * Scaffold hints injected into the system prompt based on job keywords.
 * These guide the LLM toward the best app structure for common prompt types.
 */

interface ScaffoldHint {
  keywords: string[];
  name: string;
  hint: string;
}

const SCAFFOLDS: ScaffoldHint[] = [
  {
    name: "saas-dashboard",
    keywords: ["dashboard", "analytics", "metrics", "admin", "saas", "crm", "management", "panel"],
    hint: `This looks like a dashboard app. Suggested structure:
- Sidebar with navigation links (using lucide-react icons)
- Top header with user info / breadcrumb
- Main content area with stat cards (4 KPI cards at top)
- Data table or chart below stat cards
- Use Tailwind: bg-gray-900 or bg-white theme, card shadows`,
  },
  {
    name: "crud-tool",
    keywords: ["crud", "list", "create", "edit", "delete", "manage", "form", "task", "todo", "note", "item"],
    hint: `This looks like a CRUD tool. Suggested structure:
- Header with app name + "Add New" button
- List/table of items with edit/delete actions
- Modal dialog for create/edit form
- Confirmation dialog for delete
- Empty state when no items exist
- Toast notifications for success/error feedback`,
  },
  {
    name: "ai-chat",
    keywords: ["chat", "conversation", "message", "assistant", "bot", "ai", "gpt", "llm"],
    hint: `This looks like a chat/conversation app. Suggested structure:
- Chat thread area (scrollable, messages left/right aligned)
- User messages on right (blue bg), AI messages on left (gray bg)
- Input bar at bottom with send button
- Typing indicator (animated dots)
- Timestamp on messages
- Clear/new conversation button`,
  },
  {
    name: "analytics",
    keywords: ["analytics", "chart", "graph", "report", "data", "visualization", "insight", "statistic"],
    hint: `This looks like an analytics/data visualization app. Suggested structure:
- Top bar with date range filter and export button
- 4 KPI summary cards (trend arrow + percentage change)
- Chart area (use CSS/SVG for simple bar/line chart, or just styled divs)
- Data breakdown table below
- Color-coded status indicators`,
  },
  {
    name: "productivity",
    keywords: ["productivity", "workflow", "project", "team", "kanban", "board", "tracker", "schedule", "calendar"],
    hint: `This looks like a productivity/workflow app. Suggested structure:
- Column-based layout (e.g., Todo / In Progress / Done for kanban)
- Card items with title, description, priority badge
- Add item button in each column
- Drag-and-drop hint (visual affordance even if not implemented)
- Filter/search bar at top`,
  },
];

const DEFAULT_HINT = `Build a clean, modern single-page React app with:
- Clear header with app name and navigation
- Main content area with well-organized sections
- Interactive elements that all work
- Responsive layout (mobile + desktop)
- Consistent color scheme using Tailwind`;

/**
 * Get the most relevant scaffold hint for a given job prompt.
 * Returns a hint string to inject into the system prompt.
 */
export function getScaffoldHint(prompt: string): string {
  const lower = prompt.toLowerCase();

  for (const scaffold of SCAFFOLDS) {
    if (scaffold.keywords.some(kw => lower.includes(kw))) {
      return `\n## SCAFFOLD HINT (${scaffold.name})\n${scaffold.hint}\n`;
    }
  }

  return `\n## SCAFFOLD HINT\n${DEFAULT_HINT}\n`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _noop = (_msg: string) => {};

export default getScaffoldHint;
