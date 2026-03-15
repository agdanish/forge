/**
 * Dashboard analytics shell — generates a metrics-heavy App.tsx from an AppSpec.
 * Optimized for: KPI cards, bar/line charts (pure CSS), data tables, filters, trends.
 */

import { AppSpec } from './spec.js';
import { getThemeById } from './themes.js';

export function renderDashboardShell(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');
  const statusColors = isDark
    ? `active: 'bg-emerald-900/50 text-emerald-300', pending: 'bg-amber-900/50 text-amber-300', completed: 'bg-blue-900/50 text-blue-300', archived: 'bg-gray-800 text-gray-400'`
    : `active: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', completed: 'bg-blue-100 text-blue-700', archived: 'bg-gray-100 text-gray-500'`;

  const kpiJSON = JSON.stringify(spec.kpis);
  const seedJSON = JSON.stringify(spec.seedData);
  const categoriesJSON = JSON.stringify(spec.categories);

  return `import { useState, useMemo } from 'react';
import {
  Search, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Activity,
  ArrowUpDown, Filter, Download, RefreshCw, ChevronDown, Eye,
  LayoutDashboard, List, Settings, Menu, X, AlertCircle,
  CheckCircle2, Clock, Archive, Users, DollarSign, Target, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

// ── Types ──
type Status = 'active' | 'pending' | 'completed' | 'archived';
type Priority = 'high' | 'medium' | 'low';
type Tab = 'overview' | 'analytics' | 'records';

interface DataRecord {
  id: number;
  name: string;
  description: string;
  status: Status;
  priority: Priority;
  category: string;
  value: number;
  date: string;
  assignee: string;
}

interface KpiCard {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
}

// ── Data ──
const KPIS: KpiCard[] = ${kpiJSON};
const CATEGORIES: string[] = ${categoriesJSON};
const INITIAL_DATA: DataRecord[] = (${seedJSON} as Omit<DataRecord, 'id'>[]).map((d, i) => ({ ...d, id: i + 1 }));

const STATUS_COLORS: { [key in Status]: string } = { ${statusColors} };
const fmt = (n: number) => n >= 1_000_000 ? '$' + (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? '$' + (n / 1000).toFixed(0) + 'k' : '$' + n;

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'value' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null);

  const filtered = useMemo(() => {
    let r = INITIAL_DATA.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
    r.sort((a, b) => {
      const d = sortAsc ? 1 : -1;
      if (sortField === 'name') return d * a.name.localeCompare(b.name);
      if (sortField === 'value') return d * (a.value - b.value);
      return d * (new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    return r;
  }, [search, statusFilter, categoryFilter, sortField, sortAsc]);

  // ── Stats ──
  const totalValue = INITIAL_DATA.reduce((s, r) => s + r.value, 0);
  const avgValue = totalValue / INITIAL_DATA.length;
  const statusCounts = { active: 0, pending: 0, completed: 0, archived: 0 };
  INITIAL_DATA.forEach(r => statusCounts[r.status]++);
  const categoryCounts: { [key: string]: number } = {};
  INITIAL_DATA.forEach(r => { categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1; });
  const categoryValues: { [key: string]: number } = {};
  INITIAL_DATA.forEach(r => { categoryValues[r.category] = (categoryValues[r.category] || 0) + r.value; });
  const maxCatValue = Math.max(...Object.values(categoryValues), 1);

  const toggleSort = (f: typeof sortField) => {
    if (sortField === f) setSortAsc(!sortAsc); else { setSortField(f); setSortAsc(true); }
  };

  // ── KPI Cards ──
  const KpiGrid = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {KPIS.map((kpi, i) => {
        const icons = [Target, DollarSign, Users, Zap];
        const Icon = icons[i % icons.length];
        return (
          <div key={i} className="${t.card} ${t.cardBorder} border rounded-xl p-5 card-hover animate-slide-up" style={{ animationDelay: \`\${i * 80}ms\` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="${t.textMuted} text-xs font-medium uppercase tracking-wide">{kpi.label}</p>
                <p className="${t.text} text-3xl font-bold mt-2">{kpi.value}</p>
              </div>
              <div className="p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}">
                <Icon className="w-5 h-5 ${t.accent}" />
              </div>
            </div>
            <div className={\`flex items-center gap-1.5 mt-3 text-sm \${kpi.trendUp ? '${t.success}' : '${t.danger}'}\`}>
              {kpi.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-medium">{kpi.trend}</span>
              <span className="${t.textSubtle} text-xs">vs last period</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Recharts Data ──
  const barData = Object.entries(categoryValues).sort(([,a],[,b]) => b - a).map(([name, value]) => ({ name, value }));
  const pieData = (['active', 'pending', 'completed', 'archived'] as Status[]).map(s => ({ name: s, value: statusCounts[s] }));
  const PIE_COLORS = ['${isDark ? '#34d399' : '#10b981'}', '${isDark ? '#fbbf24' : '#f59e0b'}', '${isDark ? '#60a5fa' : '#3b82f6'}', '${isDark ? '#6b7280' : '#9ca3af'}'];
  const trendData = INITIAL_DATA.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).reduce((acc: { date: string; value: number; cumulative: number }[], r) => {
    const prev = acc.length ? acc[acc.length - 1].cumulative : 0;
    acc.push({ date: r.date, value: r.value, cumulative: prev + r.value });
    return acc;
  }, []);

  // ── Bar Chart (recharts) ──
  const CategoryBarChart = () => (
    <div className="${t.card} ${t.cardBorder} border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="${t.text} font-semibold">Value by Category</h3>
        <BarChart3 className="w-5 h-5 ${t.textMuted}" />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="${isDark ? '#374151' : '#e5e7eb'}" />
          <XAxis dataKey="name" tick={{ fill: '${isDark ? '#9ca3af' : '#6b7280'}', fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fill: '${isDark ? '#9ca3af' : '#6b7280'}', fontSize: 12 }} />
          <Tooltip contentStyle={{ background: '${isDark ? '#1f2937' : '#ffffff'}', border: '1px solid ${isDark ? '#374151' : '#e5e7eb'}', borderRadius: 8, color: '${isDark ? '#f3f4f6' : '#111827'}' }} formatter={(v: number) => [fmt(v), 'Value']} />
          <Bar dataKey="value" fill="${isDark ? '#818cf8' : '#6366f1'}" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // ── Status Pie (recharts) ──
  const StatusBreakdown = () => (
    <div className="${t.card} ${t.cardBorder} border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="${t.text} font-semibold">Status Breakdown</h3>
        <PieChartIcon className="w-5 h-5 ${t.textMuted}" />
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '${isDark ? '#1f2937' : '#ffffff'}', border: '1px solid ${isDark ? '#374151' : '#e5e7eb'}', borderRadius: 8, color: '${isDark ? '#f3f4f6' : '#111827'}' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2">
        {(['active', 'pending', 'completed', 'archived'] as Status[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
            <span className="${t.textMuted} text-xs capitalize">{s} ({statusCounts[s]})</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Trend Area Chart (recharts) ──
  const TrendChart = () => (
    <div className="${t.card} ${t.cardBorder} border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="${t.text} font-semibold">Value Trend</h3>
        <Activity className="w-5 h-5 ${t.textMuted}" />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="${isDark ? '#818cf8' : '#6366f1'}" stopOpacity={0.3} />
              <stop offset="95%" stopColor="${isDark ? '#818cf8' : '#6366f1'}" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="${isDark ? '#374151' : '#e5e7eb'}" />
          <XAxis dataKey="date" tick={{ fill: '${isDark ? '#9ca3af' : '#6b7280'}', fontSize: 11 }} />
          <YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fill: '${isDark ? '#9ca3af' : '#6b7280'}', fontSize: 12 }} />
          <Tooltip contentStyle={{ background: '${isDark ? '#1f2937' : '#ffffff'}', border: '1px solid ${isDark ? '#374151' : '#e5e7eb'}', borderRadius: 8, color: '${isDark ? '#f3f4f6' : '#111827'}' }} formatter={(v: number) => [fmt(v), 'Cumulative']} />
          <Area type="monotone" dataKey="cumulative" stroke="${isDark ? '#818cf8' : '#6366f1'}" fill="url(#trendGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  // ── Activity Timeline ──
  const ActivityTimeline = () => (
    <div className="${t.card} ${t.cardBorder} border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="${t.text} font-semibold">Recent Activity</h3>
        <Activity className="w-5 h-5 ${t.textMuted}" />
      </div>
      <div className="space-y-3">
        {INITIAL_DATA.slice(0, 6).map((r, i) => (
          <div key={i} onClick={() => setSelectedRecord(r as any)} className="flex items-start gap-3 cursor-pointer ${isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'} rounded-lg p-1 -m-1 transition-colors">
            <div className="mt-1 w-2 h-2 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-blue-500'} flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="${t.text} text-sm font-medium truncate">{r.name}</p>
              <p className="${t.textSubtle} text-xs">{r.assignee} \u2022 {r.date}</p>
            </div>
            <span className={\`text-xs px-2 py-0.5 rounded-full flex-shrink-0 \${STATUS_COLORS[r.status]}\`}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Top Performers ──
  const TopPerformers = () => (
    <div className="${t.card} ${t.cardBorder} border rounded-xl p-5">
      <h3 className="${t.text} font-semibold mb-4">Top ${spec.primaryEntityPlural} by Value</h3>
      <div className="space-y-3">
        {[...INITIAL_DATA].sort((a, b) => b.value - a.value).slice(0, 5).map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className={\`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold \${i === 0 ? '${isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'}' : '${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}'}\`}>{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="${t.text} text-sm font-medium truncate">{r.name}</p>
              <p className="${t.textSubtle} text-xs">{r.category}</p>
            </div>
            <span className="${t.text} text-sm font-mono font-semibold">{fmt(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Data Table ──
  const DataTable = () => (
    <div className="${t.card} ${t.cardBorder} border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="${isDark ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-200'} border-b">
              {[['name','Name'],['status','Status'],['category','Category'],['value','Value'],['date','Date'],['assignee','Assignee']].map(([key, label]) => (
                <th key={key} onClick={() => ['name','value','date'].includes(key) ? toggleSort(key as any) : null}
                  className={\`px-4 py-3 text-left text-xs font-medium ${t.textMuted} uppercase tracking-wide \${['name','value','date'].includes(key) ? 'cursor-pointer' : ''}\`}>
                  <div className="flex items-center gap-1">{label}{sortField === key && <ArrowUpDown className="w-3 h-3" />}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-200'}">
            {filtered.map(r => (
              <tr key={r.id} onClick={() => setSelectedRecord(r)} className="${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors cursor-pointer">
                <td className="px-4 py-3"><div><span className="${t.text} text-sm font-medium">{r.name}</span><p className="${t.textSubtle} text-xs mt-0.5">{r.description}</p></div></td>
                <td className="px-4 py-3"><span className={\`text-xs px-2 py-0.5 rounded-full \${STATUS_COLORS[r.status]}\`}>{r.status}</span></td>
                <td className="px-4 py-3 ${t.textMuted} text-sm">{r.category}</td>
                <td className="px-4 py-3 ${t.text} text-sm font-mono">{fmt(r.value)}</td>
                <td className="px-4 py-3 ${t.textMuted} text-sm">{r.date}</td>
                <td className="px-4 py-3 ${t.textMuted} text-sm">{r.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="${t.textSubtle} w-8 h-8 mx-auto mb-2" />
          <p className="${t.textMuted}">No records match your filters</p>
        </div>
      )}
    </div>
  );

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'records', label: '${spec.primaryEntityPlural}', icon: List },
  ];

  return (
    <div className="min-h-screen ${t.bg} ${t.text} flex">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 ${t.card} ${t.cardBorder} border-r flex flex-col min-h-screen">
          <div className="p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}">
            <h1 className="text-xl font-bold bg-gradient-to-r ${t.gradient} bg-clip-text text-transparent">${spec.appName}</h1>
            <p className="${t.textMuted} text-xs mt-1">${spec.tagline}</p>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors \${tab === id ? '${isDark ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'}' : '${t.textMuted} ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'}'}\`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-bold">A</div>
              <div><p className="${t.text} text-sm font-medium">Admin</p><p className="${t.textSubtle} text-xs">${spec.domain}</p></div>
            </div>
          </div>
        </aside>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 ${t.card} ${t.cardBorder} border-b backdrop-blur-xl ${isDark ? 'bg-opacity-80' : 'bg-opacity-90'}">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="${t.textMuted} lg:hidden"><Menu className="w-5 h-5" /></button>
              <h2 className="text-lg font-semibold">{tabs.find(t => t.id === tab)?.label}</h2>
            </div>
            <div className="flex items-center gap-3">
              <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="px-3 py-1.5 rounded-lg ${t.input} text-sm">
                <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All time</option>
              </select>
              {tab === 'records' && (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 ${t.textSubtle} absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 pr-3 py-1.5 rounded-lg ${t.input} text-sm w-48 focus:outline-none" />
                  </div>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-1.5 rounded-lg ${t.input} text-sm">
                    <option value="all">All Status</option>
                    <option value="active">Active</option><option value="pending">Pending</option><option value="completed">Completed</option>
                  </select>
                </>
              )}
              <button className="${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} p-2 rounded-lg transition-colors"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {tab === 'overview' && (
            <>
              <KpiGrid />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CategoryBarChart />
                <StatusBreakdown />
              </div>
              <TrendChart />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityTimeline />
                <TopPerformers />
              </div>
            </>
          )}
          {tab === 'analytics' && (
            <>
              <KpiGrid />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2"><CategoryBarChart /></div>
                <StatusBreakdown />
              </div>
              <TrendChart />
              <TopPerformers />
            </>
          )}
          {tab === 'records' && <DataTable />}
        </div>
      </main>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedRecord(null)}>
          <div className="${t.card} ${t.cardBorder} border rounded-2xl w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}">
              <h3 className="text-lg font-semibold">${spec.primaryEntity} Details</h3>
              <button onClick={() => setSelectedRecord(null)} className="${t.textMuted} hover:${t.text.replace('text-', 'text-')} transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><span className="${t.textMuted} text-xs uppercase tracking-wide">Name</span><p className="${t.text} font-medium mt-1">{selectedRecord.name}</p></div>
              <div><span className="${t.textMuted} text-xs uppercase tracking-wide">Description</span><p className="${t.textMuted} text-sm mt-1">{selectedRecord.description}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="${t.textMuted} text-xs uppercase tracking-wide">Status</span><p className="mt-1"><span className={\`text-xs px-2 py-0.5 rounded-full \${STATUS_COLORS[selectedRecord.status]}\`}>{selectedRecord.status}</span></p></div>
                <div><span className="${t.textMuted} text-xs uppercase tracking-wide">Priority</span><p className="${t.text} text-sm font-medium mt-1 capitalize">{selectedRecord.priority}</p></div>
                <div><span className="${t.textMuted} text-xs uppercase tracking-wide">Category</span><p className="${t.text} text-sm mt-1">{selectedRecord.category}</p></div>
                <div><span className="${t.textMuted} text-xs uppercase tracking-wide">Value</span><p className="${t.text} text-sm font-mono font-semibold mt-1">{fmt(selectedRecord.value)}</p></div>
                <div><span className="${t.textMuted} text-xs uppercase tracking-wide">Date</span><p className="${t.textMuted} text-sm mt-1">{selectedRecord.date}</p></div>
                <div><span className="${t.textMuted} text-xs uppercase tracking-wide">Assignee</span><p className="${t.textMuted} text-sm mt-1">{selectedRecord.assignee}</p></div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setSelectedRecord(null)} className="w-full ${t.primary} ${t.primaryHover} text-white py-2.5 rounded-lg text-sm font-medium transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;
}
