/**
 * Kanban / Workflow shell — generates a complete App.tsx from an AppSpec.
 * Covers: stage columns, draggable-feel cards, priority badges, owner labels,
 * detail modal, move-stage controls, search/filter, column counts.
 * Designed for pipeline/workflow/board prompts.
 */

import { AppSpec } from './spec.js';
import { getThemeById } from './themes.js';

export function renderKanbanShell(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');

  const statusColors = isDark
    ? `active: 'bg-emerald-900/50 text-emerald-300 border-emerald-700', pending: 'bg-amber-900/50 text-amber-300 border-amber-700', completed: 'bg-blue-900/50 text-blue-300 border-blue-700', archived: 'bg-gray-800 text-gray-400 border-gray-700'`
    : `active: 'bg-emerald-100 text-emerald-700 border-emerald-300', pending: 'bg-amber-100 text-amber-700 border-amber-300', completed: 'bg-blue-100 text-blue-700 border-blue-300', archived: 'bg-gray-100 text-gray-500 border-gray-300'`;
  const priorityColors = isDark
    ? `high: 'bg-red-900/50 text-red-300', medium: 'bg-amber-900/50 text-amber-300', low: 'bg-gray-800 text-gray-400'`
    : `high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-200 text-gray-600'`;

  const kpiJSON = JSON.stringify(spec.kpis);
  const seedJSON = JSON.stringify(spec.seedData);
  const categoriesJSON = JSON.stringify(spec.categories);

  // Derive stage names from categories or use sensible defaults
  const stages = spec.categories.length >= 4
    ? spec.categories.slice(0, 5)
    : ['Backlog', 'In Progress', 'Review', 'Done'];
  const stagesJSON = JSON.stringify(stages);

  return `import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Filter, ChevronRight, ChevronLeft, X, Eye, Clock,
  AlertCircle, CheckCircle2, Archive, User, Calendar, Tag,
  MoreVertical, Plus, ArrowRight, LayoutGrid, List, TrendingUp, TrendingDown,
  GripVertical, Menu, Check, Trash2, Download, Bell, Keyboard
} from 'lucide-react';

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

// ── Export CSV ──
function exportCSV(data: any[]) {
  const headers = ['Name', 'Status', 'Priority', 'Stage', 'Value', 'Assignee', 'Date'];
  const rows = data.map((r: any) => [r.name, r.status, r.priority, r.stage, r.value, r.assignee, r.date].join(','));
  const csv = [headers.join(','), ...rows].join('\\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'kanban_export.csv'; a.click(); URL.revokeObjectURL(url);
}

interface KpiCard { label: string; value: string; trend: string; trendUp: boolean; }
interface DataRecord {
  id: number; name: string; description: string; status: 'active' | 'pending' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low'; category: string; value: number; date: string; assignee: string;
  stage?: string;
}

const STAGES: string[] = ${stagesJSON};
const KPIS: KpiCard[] = ${kpiJSON};
const CATEGORIES: string[] = ${categoriesJSON};
const STATUS_COLORS: { [key: string]: string } = { ${statusColors} } as any;
const PRIORITY_COLORS: { [key: string]: string } = { ${priorityColors} } as any;

// Assign each seed record to a stage
const RAW_DATA: DataRecord[] = (${seedJSON} as any[]).map((r: any, i: number) => ({ ...r, id: i + 1 }));
const INITIAL_DATA: DataRecord[] = RAW_DATA.map((r, i) => ({
  ...r,
  stage: STAGES[i % STAGES.length],
}));

export default function App() {
  const [items, setItems] = useState<DataRecord[]>(INITIAL_DATA);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<DataRecord | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [toast, setToast] = useState<{ message: string; undoItem?: DataRecord } | null>(null);
  const [notifications, setNotifications] = useState(3);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const showToast = (msg: string, undoItem?: DataRecord) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: msg, undoItem });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const handleUndo = () => {
    if (toast?.undoItem) { setItems(prev => [toast.undoItem!, ...prev]); setToast(null); showToast('✓ Restored'); }
  };

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { setSelectedItem(null); setShowAddForm(false); setMenuOpen(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleAddItem = () => {
    if (!newName.trim()) return;
    const newItem: DataRecord = { id: Date.now(), name: newName, description: newDesc || 'New item', category: CATEGORIES[0] || 'General', status: 'active', priority: 'medium', value: Math.floor(Math.random() * 5000) + 500, assignee: 'Unassigned', date: new Date().toISOString().split('T')[0], stage: STAGES[0] };
    setItems(prev => [newItem, ...prev]);
    setNewName(''); setNewDesc(''); setShowAddForm(false);
    showToast('✓ Item added to ' + STAGES[0]);
  };

  const handleDelete = (id: number) => {
    const item = items.find(r => r.id === id);
    setItems(prev => prev.filter(r => r.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    setMenuOpen(null);
    showToast('✓ Item removed', item);
  };

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase()) || item.assignee.toLowerCase().includes(search.toLowerCase());
      const matchPriority = priorityFilter === 'all' || item.priority === priorityFilter;
      return matchSearch && matchPriority;
    });
  }, [items, search, priorityFilter]);

  const stageGroups = useMemo(() => {
    const groups: { [key: string]: DataRecord[] } = {};
    STAGES.forEach(s => { groups[s] = []; });
    filtered.forEach(item => {
      const stage = item.stage || STAGES[0];
      if (groups[stage]) groups[stage].push(item);
      else groups[STAGES[0]].push(item);
    });
    return groups;
  }, [filtered]);

  const moveItem = (item: DataRecord, direction: 'forward' | 'back') => {
    const currentIdx = STAGES.indexOf(item.stage || STAGES[0]);
    const newIdx = direction === 'forward' ? Math.min(currentIdx + 1, STAGES.length - 1) : Math.max(currentIdx - 1, 0);
    if (newIdx === currentIdx) return;
    setItems(prev => prev.map(r => r.id === item.id ? { ...r, stage: STAGES[newIdx] } : r));
    setMenuOpen(null);
    if (selectedItem?.id === item.id) setSelectedItem({ ...item, stage: STAGES[newIdx] });
  };

  const totalValue = filtered.reduce((s, r) => s + r.value, 0);

  return (
    <div className="min-h-screen ${t.bg} ${t.text}">
      {/* Header */}
      <header className="border-b ${t.cardBorder} ${t.card} sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg ${t.primary} flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">${spec.appName}</h1>
              <p className="${t.textMuted} text-xs hidden sm:block">${spec.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddForm(true)} className="${t.primary} text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-all" aria-label="Add new item">
              <Plus className="w-4 h-4" /> Add
            </button>
            <button onClick={() => { exportCSV(items); showToast('✓ CSV exported'); }} className="${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} p-2 rounded-lg transition-colors" title="Export CSV">
              <Download className="w-4 h-4" />
            </button>
            <div className="relative">
              <button className="${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} p-2 rounded-lg transition-colors" onClick={() => { setNotifications(0); showToast('Notifications cleared'); }}>
                <Bell className="w-4 h-4" />
              </button>
              {notifications > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse-glow">{notifications}</span>}
            </div>
            <button onClick={() => setViewMode('board')} className={\`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors \${viewMode === 'board' ? '${t.primary} text-white' : '${t.textMuted} hover:${t.text}'}\`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={\`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors \${viewMode === 'list' ? '${t.primary} text-white' : '${t.textMuted} hover:${t.text}'}\`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
        {loading ? (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="${t.card} border ${t.cardBorder} rounded-xl p-3 h-20 animate-shimmer" />)}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="${t.card} border ${t.cardBorder} rounded-xl h-64 animate-shimmer" />)}
            </div>
          </div>
        ) : (<>
        {/* Filter Counter */}
        <p className="${t.textMuted} text-sm mb-3">Showing <span className="${t.text} font-medium">{filtered.length}</span> of <span className="${t.text} font-medium">{items.length}</span> items</p>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {KPIS.map((kpi, i) => (
            <div key={i} className="${t.card} border ${t.cardBorder} rounded-xl p-3">
              <p className="${t.textMuted} text-xs font-medium">{kpi.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold">{kpi.value}</span>
                <span className={\`text-xs font-medium flex items-center gap-0.5 \${kpi.trendUp ? 'text-emerald-500' : 'text-red-400'}\`}>
                  {kpi.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}" />
            <input
              ref={searchRef} type="text" placeholder="Search ${spec.primaryEntityPlural.toLowerCase()}... (Ctrl+K)" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border ${t.cardBorder} ${t.input} ${t.text} text-sm focus:outline-none focus:ring-2 focus:ring-${isDark ? 'indigo' : 'blue'}-500/50"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'high', 'medium', 'low'].map(p => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={\`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors \${priorityFilter === p ? '${t.primary} text-white' : '${t.card} border ${t.cardBorder} ${t.textMuted} hover:${t.text}'}\`}>
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Stage summary */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {STAGES.map(stage => (
            <div key={stage} className="flex items-center gap-2 px-3 py-1.5 rounded-full ${t.card} border ${t.cardBorder} text-xs font-medium whitespace-nowrap">
              <span className="${t.textMuted}">{stage}</span>
              <span className="${t.primary} text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{stageGroups[stage]?.length || 0}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full ${t.card} border ${t.cardBorder} text-xs font-medium whitespace-nowrap ml-auto">
            Total: {filtered.length} · \${totalValue.toLocaleString()}
          </div>
        </div>

        {/* Board View */}
        {viewMode === 'board' && (
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
            {STAGES.map(stage => (
              <div key={stage} className="flex-shrink-0 w-72 sm:w-80">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-sm">{stage}</h3>
                  <span className="${t.textMuted} text-xs">{stageGroups[stage]?.length || 0}</span>
                </div>
                <div className="space-y-2.5">
                  {(stageGroups[stage] || []).map((item, idx) => (
                    <div key={item.id}
                      className="${t.card} border ${t.cardBorder} rounded-xl p-3 cursor-pointer card-hover group"
                      onClick={() => setSelectedItem(item)}>
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm leading-tight flex-1">{item.name}</span>
                        <div className="relative">
                          <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === item.id ? null : item.id); }}
                            className="${t.textMuted} hover:${t.text} opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {menuOpen === item.id && (
                            <div className="absolute right-0 top-6 ${t.card} border ${t.cardBorder} rounded-lg shadow-xl z-20 py-1 min-w-[140px]"
                              onClick={e => e.stopPropagation()}>
                              {STAGES.indexOf(item.stage || STAGES[0]) > 0 && (
                                <button onClick={() => moveItem(item, 'back')}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:${t.bg} flex items-center gap-2 ${t.textMuted} hover:${t.text}">
                                  <ChevronLeft className="w-3 h-3" /> Move Back
                                </button>
                              )}
                              {STAGES.indexOf(item.stage || STAGES[0]) < STAGES.length - 1 && (
                                <button onClick={() => moveItem(item, 'forward')}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:${t.bg} flex items-center gap-2 ${t.textMuted} hover:${t.text}">
                                  <ChevronRight className="w-3 h-3" /> Move Forward
                                </button>
                              )}
                              <button onClick={() => { setSelectedItem(item); setMenuOpen(null); }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:${t.bg} flex items-center gap-2 ${t.textMuted} hover:${t.text}">
                                <Eye className="w-3 h-3" /> View Details
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="${t.textMuted} text-xs line-clamp-2 mb-2">{item.description}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={\`text-[10px] px-1.5 py-0.5 rounded-full font-medium \${(PRIORITY_COLORS as any)[item.priority] || ''}\`}>
                          {item.priority}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t ${t.cardBorder}">
                        <div className="flex items-center gap-1 ${t.textMuted}">
                          <User className="w-3 h-3" />
                          <span className="text-[10px]">{item.assignee.split(' ')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1 ${t.textMuted}">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px]">{item.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(stageGroups[stage] || []).length === 0 && (
                    <div className="border-2 border-dashed ${t.cardBorder} rounded-xl p-6 text-center ${t.textMuted} text-xs">
                      No ${spec.primaryEntityPlural.toLowerCase()} in this stage
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="${t.card} border ${t.cardBorder} rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b ${t.cardBorder}">
                  <th className="text-left px-4 py-3 ${t.textMuted} font-medium text-xs">Name</th>
                  <th className="text-left px-4 py-3 ${t.textMuted} font-medium text-xs hidden sm:table-cell">Stage</th>
                  <th className="text-left px-4 py-3 ${t.textMuted} font-medium text-xs hidden md:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 ${t.textMuted} font-medium text-xs hidden md:table-cell">Assignee</th>
                  <th className="text-left px-4 py-3 ${t.textMuted} font-medium text-xs hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-3 ${t.textMuted} font-medium text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={i} className="border-b ${t.cardBorder} hover:${t.bg} cursor-pointer transition-colors" onClick={() => setSelectedItem(item)}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="${t.textMuted} text-xs">{item.description}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs px-2 py-1 rounded-full ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}">{item.stage}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={\`text-xs px-2 py-1 rounded-full \${(PRIORITY_COLORS as any)[item.priority] || ''}\`}>{item.priority}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">{item.assignee}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs ${t.textMuted}">{item.date}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {STAGES.indexOf(item.stage || STAGES[0]) < STAGES.length - 1 && (
                          <button onClick={e => { e.stopPropagation(); moveItem(item, 'forward'); }}
                            className="p-1 rounded hover:${t.card} ${t.textMuted} hover:${t.text}" title="Move forward">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); setSelectedItem(item); }}
                          className="p-1 rounded hover:${t.card} ${t.textMuted} hover:${t.text}" title="View details">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>)}
      </main>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="${t.card} border ${t.cardBorder} rounded-2xl shadow-2xl max-w-lg w-full p-6 relative z-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{selectedItem.name}</h2>
                <p className="${t.textMuted} text-sm mt-1">{selectedItem.description}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="${t.textMuted} hover:${t.text} p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}">
                <p className="${t.textMuted} text-xs mb-1">Stage</p>
                <p className="font-medium text-sm">{selectedItem.stage}</p>
              </div>
              <div className="p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}">
                <p className="${t.textMuted} text-xs mb-1">Priority</p>
                <p className={\`font-medium text-sm capitalize \${(PRIORITY_COLORS as any)[selectedItem.priority] || ''} inline-block px-2 py-0.5 rounded-full\`}>{selectedItem.priority}</p>
              </div>
              <div className="p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}">
                <p className="${t.textMuted} text-xs mb-1">Assignee</p>
                <p className="font-medium text-sm">{selectedItem.assignee}</p>
              </div>
              <div className="p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}">
                <p className="${t.textMuted} text-xs mb-1">Date</p>
                <p className="font-medium text-sm">{selectedItem.date}</p>
              </div>
              <div className="p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}">
                <p className="${t.textMuted} text-xs mb-1">Category</p>
                <p className="font-medium text-sm">{selectedItem.category}</p>
              </div>
              <div className="p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}">
                <p className="${t.textMuted} text-xs mb-1">Value</p>
                <p className="font-medium text-sm">\${selectedItem.value.toLocaleString()}</p>
              </div>
            </div>
            {/* Move stage buttons */}
            <div className="flex gap-2">
              {STAGES.indexOf(selectedItem.stage || STAGES[0]) > 0 && (
                <button onClick={() => moveItem(selectedItem, 'back')}
                  className="flex-1 px-4 py-2 rounded-lg border ${t.cardBorder} ${t.textMuted} hover:${t.text} text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Move Back
                </button>
              )}
              {STAGES.indexOf(selectedItem.stage || STAGES[0]) < STAGES.length - 1 && (
                <button onClick={() => moveItem(selectedItem, 'forward')}
                  className="flex-1 px-4 py-2 rounded-lg ${t.primary} hover:${t.primaryHover} text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  Move Forward <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="${t.card} border ${t.cardBorder} rounded-2xl shadow-2xl max-w-md w-full p-6 relative z-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add New Item</h2>
              <button onClick={() => setShowAddForm(false)} className="${t.textMuted} hover:${t.text} p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="w-full ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" className="w-full ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={handleAddItem} className="w-full ${t.primary} text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast with Undo */}
      {toast && <div className="fixed top-4 right-4 z-50 ${isDark ? 'bg-emerald-600' : 'bg-emerald-500'} text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slide-up flex items-center gap-3">
        <Check className="w-4 h-4" /><span>{toast.message}</span>
        {toast.undoItem && <button onClick={handleUndo} className="ml-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors">Undo</button>}
      </div>}

      {/* Click-outside to close menu */}
      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}

      {/* Keyboard Shortcut Hint */}
      <div className="fixed bottom-4 left-4 ${t.textSubtle} text-xs flex items-center gap-1.5 opacity-50">
        <Keyboard className="w-3 h-3" />Ctrl+K search \u2022 Esc close
      </div>
    </div>
  );
}
`;
}
