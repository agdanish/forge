/**
 * Map / Split-View / Route Kit Renderer
 * Generates a map-list split discovery / booking / route App.tsx
 * No real map provider — faux map panel with CSS.
 */

import type { AppSpec } from '../../shells/spec.js';
import { getThemeById } from '../../shells/themes.js';

export function renderMapSpliviewKit(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');

  return `import { useState, useMemo } from 'react';
import {
  MapPin, Search, Filter, Star, Navigation, Bookmark, BookmarkCheck,
  ChevronDown, List, Map, X, Clock, DollarSign, Route, Heart,
  Phone, Globe, ChevronRight, Sliders, LocateFixed, Menu
} from 'lucide-react';

// ── Types ──
interface Location {
  id: number;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  distance: string;
  address: string;
  saved: boolean;
  x: number; // faux map position (%)
  y: number;
  status: string;
}

// ── Data ──
const CATEGORIES = ${JSON.stringify(spec.categories)};

const LOCATIONS: Location[] = ${JSON.stringify(spec.seedData.map((s, i) => ({
  id: i + 1,
  name: s.name,
  description: s.description,
  category: s.category,
  rating: (3.5 + Math.random() * 1.5),
  reviews: Math.floor(Math.random() * 300) + 10,
  price: s.value > 1000 ? '$'.repeat(Math.min(Math.ceil(s.value / 50000), 4)) : '$' + s.value,
  distance: (Math.random() * 5 + 0.3).toFixed(1) + ' mi',
  address: `${100 + i * 23} ${['Main St', 'Oak Ave', 'Park Blvd', 'Elm Dr', 'Pine Ln'][i % 5]}`,
  saved: false,
  x: 15 + Math.random() * 70,
  y: 15 + Math.random() * 70,
  status: s.status,
})))};

export default function App() {
  const [locations, setLocations] = useState<Location[]>(LOCATIONS);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showList, setShowList] = useState(true);
  const [showDetail, setShowDetail] = useState<Location | null>(null);

  const filtered = useMemo(() => {
    let result = locations;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
    }
    if (activeCategory !== 'all') {
      result = result.filter(l => l.category === activeCategory);
    }
    return result;
  }, [locations, search, activeCategory]);

  const toggleSaved = (id: number) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, saved: !l.saved } : l));
  };

  const selected = locations.find(l => l.id === selectedId) || null;

  return (
    <div className="h-screen flex flex-col ${t.bg} ${t.text}">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 ${t.card} border-b ${t.cardBorder} z-10">
        <MapPin className="w-5 h-5 ${t.accent}" />
        <h1 className="text-lg font-bold">${spec.appName}</h1>
        <div className="flex-1" />
        <button onClick={() => setShowList(!showList)} className="p-2 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}">
          {showList ? <Map className="w-4 h-4" /> : <List className="w-4 h-4" />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* List Panel */}
        <div className={\`\${showList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-96 border-r ${t.cardBorder} ${t.card} overflow-hidden\`}>
          {/* Search + Filters */}
          <div className="p-3 space-y-2 border-b ${t.cardBorder}">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search locations..."
                className="w-full pl-9 pr-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setActiveCategory('all')}
                className={\`shrink-0 px-2.5 py-1 text-xs rounded-full \${activeCategory === 'all' ? '${t.primary} text-white' : '${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}'}\`}>
                All
              </button>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={\`shrink-0 px-2.5 py-1 text-xs rounded-full \${activeCategory === cat ? '${t.primary} text-white' : '${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}'}\`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Location List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center ${t.textMuted}">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No locations found</p>
              </div>
            ) : filtered.map(loc => (
              <div key={loc.id} onClick={() => { setSelectedId(loc.id); setShowDetail(loc); }}
                className={\`w-full text-left p-3 border-b ${t.cardBorder} hover:${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} transition cursor-pointer \${selectedId === loc.id ? '${isDark ? 'bg-gray-800' : 'bg-blue-50'}' : ''}\`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{loc.name}</h3>
                    <p className="text-xs ${t.textMuted} mt-0.5 truncate">{loc.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">{loc.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-xs ${t.textMuted}">({loc.reviews})</span>
                      <span className="text-xs ${t.textMuted}">·</span>
                      <span className="text-xs">{loc.price}</span>
                      <span className="text-xs ${t.textMuted}">·</span>
                      <span className="text-xs ${t.textMuted}">{loc.distance}</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleSaved(loc.id); }}
                    className={\`p-1 \${loc.saved ? '${t.accent}' : '${t.textMuted}'}\`}>
                    {loc.saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faux Map Panel */}
        <div className={\`\${!showList ? 'flex' : 'hidden'} md:flex flex-1 flex-col\`}>
          <div className="flex-1 relative ${isDark ? 'bg-gray-900' : 'bg-blue-50'} overflow-hidden">
            {/* Grid lines for map effect */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#fff' : '#000'} 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />

            {/* Road-like lines */}
            <div className="absolute top-1/3 left-0 right-0 h-[2px] ${isDark ? 'bg-gray-700' : 'bg-gray-300'}" />
            <div className="absolute top-2/3 left-0 right-0 h-[2px] ${isDark ? 'bg-gray-700' : 'bg-gray-300'}" />
            <div className="absolute left-1/4 top-0 bottom-0 w-[2px] ${isDark ? 'bg-gray-700' : 'bg-gray-300'}" />
            <div className="absolute left-3/4 top-0 bottom-0 w-[2px] ${isDark ? 'bg-gray-700' : 'bg-gray-300'}" />

            {/* Map Pins */}
            {filtered.map(loc => (
              <button key={loc.id}
                onClick={() => { setSelectedId(loc.id); setShowDetail(loc); }}
                className={\`absolute transform -translate-x-1/2 -translate-y-full transition-all \${selectedId === loc.id ? 'scale-125 z-10' : 'hover:scale-110'}\`}
                style={{ left: loc.x + '%', top: loc.y + '%' }}>
                <div className={\`flex flex-col items-center\`}>
                  <div className={\`px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap shadow-lg \${selectedId === loc.id ? '${t.primary} text-white' : '${t.card} ${t.text}'}\`}>
                    {loc.name.split(' ')[0]}
                  </div>
                  <MapPin className={\`w-5 h-5 -mt-0.5 \${selectedId === loc.id ? 'text-red-500' : '${t.accent}'}\`} />
                </div>
              </button>
            ))}

            {/* Locate Me button */}
            <button className="absolute bottom-4 right-4 p-3 rounded-full ${t.card} shadow-lg border ${t.cardBorder}">
              <LocateFixed className="w-5 h-5 ${t.accent}" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {showDetail && (
        <div className="fixed inset-0 z-30 flex items-end md:items-center justify-center bg-black/40" onClick={() => setShowDetail(null)}>
          <div className={\`${t.card} w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[70vh] overflow-y-auto\`} onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold">{showDetail.name}</h2>
                  <p className="text-sm ${t.textMuted} mt-0.5">{showDetail.address}</p>
                </div>
                <button onClick={() => setShowDetail(null)}><X className="w-5 h-5 ${t.textMuted}" /></button>
              </div>
              <p className="text-sm ${t.textMuted} mb-3">{showDetail.description}</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-sm">{showDetail.rating.toFixed(1)}</span>
                  <span className="text-sm ${t.textMuted}">({showDetail.reviews})</span>
                </div>
                <span className="text-sm">{showDetail.price}</span>
                <span className="text-sm ${t.textMuted}">{showDetail.distance} away</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 rounded-xl ${t.primary} text-white font-medium hover:opacity-90 flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4" /> Directions
                </button>
                <button onClick={() => toggleSaved(showDetail.id)}
                  className={\`px-4 py-2.5 rounded-xl border ${t.cardBorder} \${showDetail.saved ? '${t.accent}' : ''} hover:opacity-90\`}>
                  {showDetail.saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;
}
