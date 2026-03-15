/**
 * Universal workspace shell — generates a complete App.tsx from an AppSpec.
 * Covers: sidebar nav, search, KPI cards, filterable list, detail panel,
 * board view, add/edit modal — all parameterized from the spec.
 */

import { AppSpec } from './spec.js';
import { getThemeById, Theme } from './themes.js';

export function renderUniversalShell(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');
  const statusColors = isDark
    ? `active: 'bg-emerald-900/50 text-emerald-300', pending: 'bg-amber-900/50 text-amber-300', completed: 'bg-blue-900/50 text-blue-300', archived: 'bg-gray-800 text-gray-400'`
    : `active: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', completed: 'bg-blue-100 text-blue-700', archived: 'bg-gray-100 text-gray-500'`;
  const priorityColors = isDark
    ? `high: 'bg-red-900/50 text-red-300', medium: 'bg-amber-900/50 text-amber-300', low: 'bg-gray-800 text-gray-400'`
    : `high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-200 text-gray-600'`;

  const kpiJSON = JSON.stringify(spec.kpis);
  const seedJSON = JSON.stringify(spec.seedData);
  const categoriesJSON = JSON.stringify(spec.categories);
  const viewsJSON = JSON.stringify(spec.views);

  return `import { useState, useMemo } from 'react';
import {
  Search, Plus, Filter, LayoutDashboard, List, Columns3,
  ChevronDown, X, Edit3, Trash2, Eye, TrendingUp, TrendingDown,
  CheckCircle2, Clock, Archive, AlertCircle, Menu, ArrowUpDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Types ──
type Status = 'active' | 'pending' | 'completed' | 'archived';
type Priority = 'high' | 'medium' | 'low';
type ViewMode = ${spec.views.map(v => `'${v}'`).join(' | ')};

interface ${spec.primaryEntity} {
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

// ── Seed Data ──
const INITIAL_KPIS: KpiCard[] = ${kpiJSON};
const CATEGORIES: string[] = ${categoriesJSON};
const VIEWS: ViewMode[] = ${viewsJSON} as ViewMode[];

let nextId = 100;
const INITIAL_DATA: ${spec.primaryEntity}[] = (${seedJSON} as Omit<${spec.primaryEntity}, 'id'>[]).map((d, i) => ({ ...d, id: i + 1 }));

// ── Theme Constants ──
const STATUS_COLORS: Record<Status, string> = { ${statusColors} };
const PRIORITY_COLORS: Record<Priority, string> = { ${priorityColors} };

// ── Helpers ──
const fmt = (n: number) => n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? '$' + (n / 1000).toFixed(0) + 'k' : '$' + n;

export default function App() {
  const [items, setItems] = useState<${spec.primaryEntity}[]>(INITIAL_DATA);
  const [view, setView] = useState<ViewMode>(VIEWS[0]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'date' | 'value' | 'priority'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<${spec.primaryEntity} | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<${spec.primaryEntity} | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Filtering & Sorting ──
  const filtered = useMemo(() => {
    let result = items.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
    result.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortField === 'name') return dir * a.name.localeCompare(b.name);
      if (sortField === 'date') return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sortField === 'value') return dir * (a.value - b.value);
      const pOrder = { high: 3, medium: 2, low: 1 };
      return dir * (pOrder[a.priority] - pOrder[b.priority]);
    });
    return result;
  }, [items, search, statusFilter, categoryFilter, sortField, sortAsc]);

  // ── CRUD ──
  const handleSave = (data: Omit<${spec.primaryEntity}, 'id'>) => {
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...data, id: editItem.id } : i));
      if (selected?.id === editItem.id) setSelected({ ...data, id: editItem.id });
    } else {
      const newItem = { ...data, id: nextId++ };
      setItems(prev => [newItem, ...prev]);
    }
    setShowModal(false);
    setEditItem(null);
  };

  const handleDelete = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  // ── Trend Data ──
  const trendData = useMemo(() => {
    return [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).reduce((acc: { date: string; value: number; total: number }[], r) => {
      const prev = acc.length ? acc[acc.length - 1].total : 0;
      acc.push({ date: r.date, value: r.value, total: prev + r.value });
      return acc;
    }, []);
  }, [items]);

  // ── KPI Section ──
  const KpiSection = () => (
    <div className="space-y-6 mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {INITIAL_KPIS.map((kpi, i) => (
          <div key={i} className="${t.card} ${t.cardBorder} border rounded-xl p-4 card-hover" style={{ animationDelay: \`\${i * 80}ms\` }}>
            <p className="${t.textMuted} text-xs font-medium uppercase tracking-wide">{kpi.label}</p>
            <p className="${t.text} text-2xl font-bold mt-1">{kpi.value}</p>
            <div className={\`flex items-center gap-1 mt-2 text-sm \${kpi.trendUp ? '${t.success}' : '${t.danger}'}\`}>
              {kpi.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="${t.card} ${t.cardBorder} border rounded-xl p-5">
        <h3 className="${t.text} font-semibold mb-3">Value Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="${isDark ? '#818cf8' : '#6366f1'}" stopOpacity={0.3} />
                <stop offset="95%" stopColor="${isDark ? '#818cf8' : '#6366f1'}" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="${isDark ? '#374151' : '#e5e7eb'}" />
            <XAxis dataKey="date" tick={{ fill: '${isDark ? '#9ca3af' : '#6b7280'}', fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fill: '${isDark ? '#9ca3af' : '#6b7280'}', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '${isDark ? '#1f2937' : '#ffffff'}', border: '1px solid ${isDark ? '#374151' : '#e5e7eb'}', borderRadius: 8, color: '${isDark ? '#f3f4f6' : '#111827'}' }} formatter={(v: number) => [fmt(v), 'Total']} />
            <Area type="monotone" dataKey="total" stroke="${isDark ? '#818cf8' : '#6366f1'}" fill="url(#kpiGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // ── Board View ──
  const BoardView = () => {
    const columns: Status[] = ['active', 'pending', 'completed', 'archived'];
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map(status => (
          <div key={status} className="${t.card} ${t.cardBorder} border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="${t.text} font-semibold capitalize">{status}</h3>
              <span className={\`text-xs px-2 py-0.5 rounded-full \${STATUS_COLORS[status]}\`}>{filtered.filter(i => i.status === status).length}</span>
            </div>
            <div className="space-y-2">
              {filtered.filter(i => i.status === status).map(item => (
                <div key={item.id} onClick={() => setSelected(item)} className="${isDark ? 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/50' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'} border rounded-lg p-3 cursor-pointer card-hover">
                  <p className="${t.text} text-sm font-medium">{item.name}</p>
                  <p className="${t.textMuted} text-xs mt-1 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={\`text-xs px-1.5 py-0.5 rounded \${PRIORITY_COLORS[item.priority]}\`}>{item.priority}</span>
                    <span className="${t.textSubtle} text-xs">{item.assignee.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
              {filtered.filter(i => i.status === status).length === 0 && (
                <p className="${t.textSubtle} text-xs text-center py-4">No ${spec.primaryEntityPlural.toLowerCase()}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── List View ──
  const ListView = () => (
    <div className="${t.card} ${t.cardBorder} border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="${isDark ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-200'} border-b">
              {[['name','Name'],['status','Status'],['priority','Priority'],['category','Category'],['value','Value'],['date','Date'],['assignee','Assignee']].map(([key, label]) => (
                <th key={key} onClick={() => ['name','date','value','priority'].includes(key) ? toggleSort(key as any) : null}
                  className={\`px-4 py-3 text-left text-xs font-medium ${t.textMuted} uppercase tracking-wide \${['name','date','value','priority'].includes(key) ? 'cursor-pointer hover:${isDark ? 'text-white' : 'text-gray-900'}' : ''}\`}>
                  <div className="flex items-center gap-1">{label}{sortField === key && <ArrowUpDown className="w-3 h-3" />}</div>
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium ${t.textMuted} uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-200'}">
            {filtered.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)} className="${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} cursor-pointer transition-colors">
                <td className="px-4 py-3"><span className="${t.text} text-sm font-medium">{item.name}</span></td>
                <td className="px-4 py-3"><span className={\`text-xs px-2 py-0.5 rounded-full \${STATUS_COLORS[item.status]}\`}>{item.status}</span></td>
                <td className="px-4 py-3"><span className={\`text-xs px-2 py-0.5 rounded \${PRIORITY_COLORS[item.priority]}\`}>{item.priority}</span></td>
                <td className="px-4 py-3 ${t.textMuted} text-sm">{item.category}</td>
                <td className="px-4 py-3 ${t.text} text-sm font-mono">{fmt(item.value)}</td>
                <td className="px-4 py-3 ${t.textMuted} text-sm">{item.date}</td>
                <td className="px-4 py-3 ${t.textMuted} text-sm">{item.assignee}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditItem(item); setShowModal(true); }} className="${t.textMuted} hover:${isDark ? 'text-white' : 'text-gray-900'} p-1"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="${t.textMuted} hover:${t.danger} p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="${t.textSubtle} w-8 h-8 mx-auto mb-2" />
          <p className="${t.textMuted}">No ${spec.primaryEntityPlural.toLowerCase()} found</p>
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }} className="${t.accent} text-sm mt-1 hover:underline">Clear filters</button>
        </div>
      )}
    </div>
  );

  // ── Modal ──
  const Modal = () => {
    const [form, setForm] = useState<Omit<${spec.primaryEntity}, 'id'>>(editItem || {
      name: '', description: '', status: 'pending' as Status, priority: 'medium' as Priority,
      category: CATEGORIES[0], value: 0, date: new Date().toISOString().split('T')[0], assignee: ''
    });
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditItem(null); }}>
        <div className="${t.card} ${t.cardBorder} border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="${t.text} text-lg font-semibold">{editItem ? 'Edit' : 'Add'} ${spec.primaryEntity}</h2>
            <button onClick={() => { setShowModal(false); setEditItem(null); }} className="${t.textMuted} hover:${isDark ? 'text-white' : 'text-gray-900'}"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Name" className="w-full px-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none focus:ring-2 focus:ring-${isDark ? 'indigo' : 'blue'}-500" />
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={2} className="w-full px-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none focus:ring-2 focus:ring-${isDark ? 'indigo' : 'blue'}-500 resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as Status})} className="px-3 py-2 rounded-lg ${t.input} text-sm">
                <option value="active">Active</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="archived">Archived</option>
              </select>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as Priority})} className="px-3 py-2 rounded-lg ${t.input} text-sm">
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="px-3 py-2 rounded-lg ${t.input} text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" value={form.value} onChange={e => setForm({...form, value: Number(e.target.value)})} placeholder="Value" className="px-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="px-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none" />
              <input value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} placeholder="Assignee" className="px-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1 px-4 py-2 rounded-lg ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} text-sm font-medium transition-colors">Cancel</button>
            <button onClick={() => form.name.trim() && handleSave(form)} className="flex-1 px-4 py-2 rounded-lg ${t.primary} text-white text-sm font-medium ${t.primaryHover} transition-colors disabled:opacity-50">
              {editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Detail Panel ──
  const DetailPanel = () => selected && (
    <div className="fixed inset-y-0 right-0 w-full max-w-md z-40 ${t.card} ${t.cardBorder} border-l shadow-2xl transform transition-transform">
      <div className="p-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="${t.text} text-lg font-semibold">${spec.primaryEntity} Details</h2>
          <button onClick={() => setSelected(null)} className="${t.textMuted} hover:${isDark ? 'text-white' : 'text-gray-900'}"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><p className="${t.textMuted} text-xs uppercase tracking-wide">Name</p><p className="${t.text} font-medium mt-1">{selected.name}</p></div>
          <div><p className="${t.textMuted} text-xs uppercase tracking-wide">Description</p><p className="${t.textMuted} text-sm mt-1">{selected.description}</p></div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="${t.textMuted} text-xs uppercase tracking-wide">Status</p><span className={\`text-xs px-2 py-0.5 rounded-full mt-1 inline-block \${STATUS_COLORS[selected.status]}\`}>{selected.status}</span></div>
            <div><p className="${t.textMuted} text-xs uppercase tracking-wide">Priority</p><span className={\`text-xs px-2 py-0.5 rounded mt-1 inline-block \${PRIORITY_COLORS[selected.priority]}\`}>{selected.priority}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="${t.textMuted} text-xs uppercase tracking-wide">Category</p><p className="${t.text} text-sm mt-1">{selected.category}</p></div>
            <div><p className="${t.textMuted} text-xs uppercase tracking-wide">Value</p><p className="${t.text} text-sm font-mono mt-1">{fmt(selected.value)}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="${t.textMuted} text-xs uppercase tracking-wide">Date</p><p className="${t.text} text-sm mt-1">{selected.date}</p></div>
            <div><p className="${t.textMuted} text-xs uppercase tracking-wide">Assignee</p><p className="${t.text} text-sm mt-1">{selected.assignee}</p></div>
          </div>
          <div className="flex gap-2 pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}">
            <button onClick={() => { setEditItem(selected); setShowModal(true); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${t.primary} text-white text-sm ${t.primaryHover} transition-colors"><Edit3 className="w-4 h-4" />Edit</button>
            <button onClick={() => handleDelete(selected.id)} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'} text-sm transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );

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
            {VIEWS.map(v => {
              const Icon = v === 'Dashboard' ? LayoutDashboard : v === 'Board' ? Columns3 : List;
              return (
                <button key={v} onClick={() => setView(v)} className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors \${view === v ? '${isDark ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'}' : '${t.textMuted} ${isDark ? 'hover:bg-gray-800/50 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'}'}\`}>
                  <Icon className="w-4 h-4" />{v}
                </button>
              );
            })}
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
      <main className="flex-1 min-h-screen overflow-y-auto">
        <header className="sticky top-0 z-20 ${t.card} ${t.cardBorder} border-b backdrop-blur-xl ${isDark ? 'bg-opacity-80' : 'bg-opacity-90'}">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="${t.textMuted} hover:${isDark ? 'text-white' : 'text-gray-900'} lg:hidden"><Menu className="w-5 h-5" /></button>
              <h2 className="text-lg font-semibold">{view}</h2>
              <span className={\`text-xs px-2 py-0.5 rounded-full ${t.badge} border\`}>{filtered.length} ${spec.primaryEntityPlural.toLowerCase()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 ${t.textSubtle} absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 pr-3 py-1.5 rounded-lg ${t.input} text-sm w-48 focus:outline-none focus:ring-2 focus:ring-${isDark ? 'indigo' : 'blue'}-500" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-1.5 rounded-lg ${t.input} text-sm">
                <option value="all">All Status</option>
                <option value="active">Active</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="archived">Archived</option>
              </select>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-1.5 rounded-lg ${t.input} text-sm">
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => { setEditItem(null); setShowModal(true); }} className="${t.primary} text-white px-4 py-1.5 rounded-lg text-sm font-medium ${t.primaryHover} transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />Add ${spec.primaryEntity}
              </button>
            </div>
          </div>
        </header>

        {/* Reactive Filter Summary */}
        {(statusFilter !== 'all' || categoryFilter !== 'all' || search) && (
          <div className="px-6 py-3 border-b ${t.cardBorder} ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'} flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="${t.textMuted} text-xs font-medium">Showing</span>
              <span className="${t.accent} text-sm font-bold">{filtered.length}</span>
              <span className="${t.textMuted} text-xs">of {items.length} ${spec.primaryEntityPlural.toLowerCase()}</span>
              {search && <span className="text-xs px-2 py-0.5 rounded-full ${t.badge} border flex items-center gap-1">Search: "{search}" <button onClick={() => setSearch('')} className="hover:${isDark ? 'text-white' : 'text-gray-900'}"><X className="w-3 h-3" /></button></span>}
              {statusFilter !== 'all' && <span className="text-xs px-2 py-0.5 rounded-full ${t.badge} border flex items-center gap-1 capitalize">{statusFilter} <button onClick={() => setStatusFilter('all')} className="hover:${isDark ? 'text-white' : 'text-gray-900'}"><X className="w-3 h-3" /></button></span>}
              {categoryFilter !== 'all' && <span className="text-xs px-2 py-0.5 rounded-full ${t.badge} border flex items-center gap-1">{categoryFilter} <button onClick={() => setCategoryFilter('all')} className="hover:${isDark ? 'text-white' : 'text-gray-900'}"><X className="w-3 h-3" /></button></span>}
            </div>
            <div className="flex items-center gap-4">
              <span className="${t.textSubtle} text-xs">Total: <strong className="${t.text}">{fmt(filtered.reduce((s, i) => s + i.value, 0))}</strong></span>
              <button onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); }} className="${t.textMuted} text-xs hover:${isDark ? 'text-white' : 'text-gray-900'} underline">Clear all</button>
            </div>
          </div>
        )}

        <div className="p-6">
          {(view === 'Dashboard' || VIEWS.length === 1) && <KpiSection />}
          {view === 'Board' ? <BoardView /> : <ListView />}
        </div>
      </main>

      {/* Overlays */}
      {showModal && <Modal />}
      <DetailPanel />
    </div>
  );
}`;
}
