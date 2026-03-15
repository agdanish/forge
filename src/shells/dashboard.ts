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

  return `import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Activity,
  ArrowUpDown, Filter, Download, RefreshCw, ChevronDown, Eye,
  LayoutDashboard, List, Settings, Menu, X, AlertCircle,
  CheckCircle2, Clock, Archive, Users, DollarSign, Target, Zap,
  Plus, Trash2, Edit3, Check, Bell, Keyboard, Command
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

// ── Search Highlight ──
function Hl({ text, q }: { text: string; q: string }) {
  if (!q.trim()) return <>{text}</>;
  const re = new RegExp('(' + q.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi');
  return <>{text.split(re).map((part, i) => re.test(part) ? <mark key={i} className="bg-yellow-400/30 text-inherit rounded px-0.5">{part}</mark> : part)}</>;
}

// ── Animated Counter Hook ──
function useCountUp(end: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [end, duration]);
  return value;
}

// ── Export CSV Utility ──
function exportCSV(data: DataRecord[]) {
  const headers = ['Name', 'Status', 'Priority', 'Category', 'Value', 'Date', 'Assignee'];
  const rows = data.map(r => [r.name, r.status, r.priority, r.category, r.value, r.date, r.assignee].join(','));
  const csv = [headers.join(','), ...rows].join('\\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '${spec.appName.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv';
  a.click(); URL.revokeObjectURL(url);
}

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
  const [data, setData] = useState(() => {
    try { const s = localStorage.getItem('${spec.appName.replace(/[^a-zA-Z0-9]/g, '_')}_data'); return s ? JSON.parse(s) : INITIAL_DATA; } catch { return INITIAL_DATA; }
  });
  const [toast, setToast] = useState<{ message: string; undoItem?: DataRecord } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [notifications, setNotifications] = useState(3);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // Loading skeleton on mount
  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  // Persist data to localStorage
  useEffect(() => { try { localStorage.setItem('${spec.appName.replace(/[^a-zA-Z0-9]/g, '_')}_data', JSON.stringify(data)); } catch {} }, [data]);

  const showToast = (msg: string, undoItem?: DataRecord) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: msg, undoItem });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const handleUndo = () => {
    if (toast?.undoItem) { setData(prev => [toast.undoItem!, ...prev]); setToast(null); showToast('✓ Restored'); }
  };

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); setTab('records'); }
      if (e.key === 'Escape') { setSelectedRecord(null); setShowAddModal(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── CRUD Handlers ──
  const handleAdd = () => {
    if (!newName.trim()) return;
    const item: DataRecord = { id: Date.now(), name: newName, description: newDesc || 'New item', status: 'active', priority: 'medium', category: CATEGORIES[0], value: Math.floor(Math.random() * 5000) + 500, date: new Date().toISOString().split('T')[0], assignee: 'You' };
    setData(prev => [item, ...prev]);
    setNewName(''); setNewDesc(''); setShowAddModal(false);
    showToast('✓ ${spec.primaryEntity} added successfully');
    setNotifications(n => n + 1);
  };

  const handleDelete = (id: number) => {
    const item = data.find(r => r.id === id);
    setData(prev => prev.filter(r => r.id !== id));
    setSelectedRecord(null);
    showToast('✓ ${spec.primaryEntity} deleted', item);
  };

  // Inline status cycling
  const cycleStatus = (id: number) => {
    const order: Status[] = ['pending', 'active', 'completed', 'archived'];
    setData(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = order[(order.indexOf(r.status) + 1) % order.length];
      return { ...r, status: next };
    }));
    showToast('✓ Status cycled');
  };

  const handleStatusChange = (id: number, status: Status) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    showToast('✓ Status updated to ' + status);
  };

  const filtered = useMemo(() => {
    let r = data.filter(item => {
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
  }, [data, search, statusFilter, categoryFilter, sortField, sortAsc]);

  // ── Stats ──
  const totalValue = data.reduce((s, r) => s + r.value, 0);
  const avgValue = totalValue / data.length;
  const statusCounts = { active: 0, pending: 0, completed: 0, archived: 0 };
  data.forEach(r => statusCounts[r.status]++);
  const categoryCounts: { [key: string]: number } = {};
  data.forEach(r => { categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1; });
  const categoryValues: { [key: string]: number } = {};
  data.forEach(r => { categoryValues[r.category] = (categoryValues[r.category] || 0) + r.value; });
  const maxCatValue = Math.max(...Object.values(categoryValues), 1);

  const toggleSort = (f: typeof sortField) => {
    if (sortField === f) setSortAsc(!sortAsc); else { setSortField(f); setSortAsc(true); }
  };

  // ── Animated KPI Values ──
  const animTotal = useCountUp(data.length);
  const animActive = useCountUp(statusCounts.active);
  const animCompleted = useCountUp(statusCounts.completed);
  const animValue = useCountUp(totalValue);

  // ── KPI Cards ──
  const KpiGrid = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {KPIS.map((kpi, i) => {
        const icons = [Target, DollarSign, Users, Zap];
        const Icon = icons[i % icons.length];
        const animValues = [animTotal, animValue, animActive, animCompleted];
        return (
          <div key={i} className="${t.card} ${t.cardBorder} border rounded-xl p-5 card-hover animate-slide-up" style={{ animationDelay: \`\${i * 80}ms\` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="${t.textMuted} text-xs font-medium uppercase tracking-wide">{kpi.label}</p>
                <p className="${t.text} text-3xl font-bold mt-2 animate-count">{i === 1 ? fmt(animValues[i]) : animValues[i].toLocaleString()}</p>
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
  const trendData = data.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).reduce((acc: { date: string; value: number; cumulative: number }[], r) => {
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
        {data.slice(0, 6).map((r, i) => (
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
        {[...data].sort((a, b) => b.value - a.value).slice(0, 5).map((r, i) => (
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
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="${t.textMuted} text-sm">Showing <span className="${t.text} font-medium">{filtered.length}</span> of <span className="${t.text} font-medium">{data.length}</span> ${spec.primaryEntityPlural.toLowerCase()}</p>
        <p className="${t.textSubtle} text-xs">Click status badge to cycle</p>
      </div>
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
                <tr key={r.id} className="${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors cursor-pointer">
                  <td className="px-4 py-3" onClick={() => setSelectedRecord(r)}><div><span className="${t.text} text-sm font-medium"><Hl text={r.name} q={search} /></span><p className="${t.textSubtle} text-xs mt-0.5"><Hl text={r.description} q={search} /></p></div></td>
                  <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); cycleStatus(r.id); }} className={\`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:ring-2 hover:ring-indigo-500/40 transition-all \${STATUS_COLORS[r.status]}\`} title="Click to change status">{r.status}</button></td>
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
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }} className="${t.accent} text-sm mt-2 hover:underline">Clear all filters</button>
          </div>
        )}
      </div>
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
                    <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search... (Ctrl+K)" className="pl-9 pr-3 py-1.5 rounded-lg ${t.input} text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-1.5 rounded-lg ${t.input} text-sm">
                    <option value="all">All Status</option>
                    <option value="active">Active</option><option value="pending">Pending</option><option value="completed">Completed</option>
                  </select>
                </>
              )}
              <button onClick={() => setShowAddModal(true)} className="${t.primary} ${t.primaryHover} text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"><Plus className="w-4 h-4" />Add</button>
              <button onClick={() => { exportCSV(filtered); showToast('✓ CSV exported'); }} className="${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} p-2 rounded-lg transition-colors" title="Export CSV"><Download className="w-4 h-4" /></button>
              <div className="relative">
                <button className="${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} p-2 rounded-lg transition-colors" onClick={() => { setNotifications(0); showToast('Notifications cleared'); }}>
                  <Bell className="w-4 h-4" />
                </button>
                {notifications > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse-glow">{notifications}</span>}
              </div>
              <button className="${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} p-2 rounded-lg transition-colors"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="${t.card} ${t.cardBorder} border rounded-xl p-5 h-28 animate-shimmer" />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1,2].map(i => <div key={i} className="${t.card} ${t.cardBorder} border rounded-xl h-64 animate-shimmer" />)}
              </div>
            </div>
          ) : tab === 'overview' && (
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
          {!loading && tab === 'analytics' && (
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
          {!loading && tab === 'records' && <DataTable />}
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
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { handleStatusChange(selectedRecord.id, selectedRecord.status === 'completed' ? 'active' : 'completed'); setSelectedRecord(null); }} className="flex-1 ${t.primary} ${t.primaryHover} text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />{selectedRecord.status === 'completed' ? 'Reopen' : 'Complete'}
              </button>
              <button onClick={() => handleDelete(selectedRecord.id)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2">
                <Trash2 className="w-4 h-4" />Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="${t.card} ${t.cardBorder} border rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}">
              <h3 className="text-lg font-semibold">Add New ${spec.primaryEntity}</h3>
              <button onClick={() => setShowAddModal(false)} className="${t.textMuted}"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="${t.textMuted} text-xs uppercase tracking-wide">Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Enter name..." className="mt-1 w-full px-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" autoFocus />
              </div>
              <div>
                <label className="${t.textMuted} text-xs uppercase tracking-wide">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Enter description..." className="mt-1 w-full px-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 h-20 resize-none" />
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={handleAdd} disabled={!newName.trim()} className="w-full ${t.primary} ${t.primaryHover} text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />Add ${spec.primaryEntity}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast with Undo */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] animate-slide-up">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-2xl">
            <Check className="w-4 h-4" /><span>{toast.message}</span>
            {toast.undoItem && <button onClick={handleUndo} className="ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors">Undo</button>}
          </div>
        </div>
      )}

      {/* Keyboard Shortcut Hint */}
      <div className="fixed bottom-6 left-6 ${t.textSubtle} text-xs flex items-center gap-1.5 opacity-50">
        <Keyboard className="w-3 h-3" />Ctrl+K search \u2022 Esc close
      </div>
    </div>
  );
}`;
}
