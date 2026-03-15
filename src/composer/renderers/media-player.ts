/**
 * Media / Player Kit Renderer
 * Generates a music/video/podcast player App.tsx
 * No real media streaming — simulated progress and playlist.
 */

import type { AppSpec } from '../../shells/spec.js';
import { getThemeById } from '../../shells/themes.js';

export function renderMediaPlayerKit(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');

  return `import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Repeat, Shuffle, Heart, ListMusic, Search, MoreHorizontal,
  Clock, Music, Disc3, ChevronRight, Library, Home, Plus,
  X, Menu, ChevronDown
} from 'lucide-react';

// ── Types ──
interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  category: string;
  duration: number; // seconds
  liked: boolean;
}

// ── Data ──
const CATEGORIES = ${JSON.stringify(spec.categories)};

const TRACKS: Track[] = ${JSON.stringify(spec.seedData.map((s, i) => ({
  id: i + 1,
  title: s.name,
  artist: s.assignee,
  album: s.category + ' Collection',
  category: s.category,
  duration: 180 + Math.floor(Math.random() * 180),
  liked: s.priority === 'high',
})))};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}

type ViewMode = 'library' | 'queue' | 'search';

export default function App() {
  const [tracks] = useState<Track[]>(TRACKS);
  const [queue, setQueue] = useState<Track[]>(TRACKS);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(TRACKS[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [view, setView] = useState<ViewMode>('library');
  const [liked, setLiked] = useState<Set<number>>(new Set(TRACKS.filter(t => t.liked).map(t => t.id)));
  const intervalRef = useRef<number | null>(null);

  const currentTrackId = currentTrack?.id ?? null;
  const currentTrackDuration = currentTrack?.duration ?? 0;

  // Simulate playback progress
  useEffect(() => {
    if (isPlaying && currentTrackId !== null) {
      intervalRef.current = window.setInterval(() => {
        setProgress(prev => prev + 1);
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, currentTrackId]);

  // Auto-advance to next track when progress exceeds duration
  useEffect(() => {
    if (currentTrackId !== null && progress >= currentTrackDuration) {
      playNext();
    }
  }, [progress, currentTrackId, currentTrackDuration]);

  const filtered = useMemo(() => {
    let result = tracks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    if (activeCategory !== 'all') {
      result = result.filter(t => t.category === activeCategory);
    }
    return result;
  }, [tracks, search, activeCategory]);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setProgress(0);
    setIsPlaying(true);
  };

  const playNext = () => {
    if (!currentTrack) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    const next = queue[(idx + 1) % queue.length];
    if (next) playTrack(next);
  };

  const playPrev = () => {
    if (!currentTrack) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    const prev = queue[(idx - 1 + queue.length) % queue.length];
    if (prev) playTrack(prev);
  };

  const toggleLike = (id: number) => {
    setLiked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setProgress(Math.floor(pct * currentTrack.duration));
  };

  return (
    <div className="h-screen flex flex-col ${t.bg} ${t.text}">
      {/* Top Navigation */}
      <header className="flex items-center gap-3 px-4 py-3 ${t.card} border-b ${t.cardBorder}">
        <Music className="w-5 h-5 ${t.accent}" />
        <h1 className="text-lg font-bold">${spec.appName}</h1>
        <div className="flex-1" />
        <div className="flex gap-1">
          {(['library', 'queue', 'search'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={\`px-3 py-1 text-xs rounded-full \${view === v ? '${t.primary} text-white' : '${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}'}\`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {/* Search (visible in search view) */}
          {view === 'search' && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tracks, artists..."
                className="w-full pl-9 pr-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none" />
            </div>
          )}

          {/* Category Chips */}
          {(view === 'library' || view === 'search') && (
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4">
              <button onClick={() => setActiveCategory('all')}
                className={\`shrink-0 px-3 py-1 text-xs rounded-full \${activeCategory === 'all' ? '${t.primary} text-white' : '${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}'}\`}>
                All
              </button>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={\`shrink-0 px-3 py-1 text-xs rounded-full \${activeCategory === cat ? '${t.primary} text-white' : '${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}'}\`}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Track List */}
          <div className="space-y-1">
            {(view === 'queue' ? queue : filtered).map((track, i) => (
              <div key={track.id} onClick={() => playTrack(track)}
                className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition cursor-pointer \${currentTrack?.id === track.id ? '${isDark ? 'bg-gray-800' : 'bg-blue-50'}' : 'hover:${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}'}\`}>
                <span className="w-6 text-center text-xs ${t.textMuted}">
                  {currentTrack?.id === track.id && isPlaying
                    ? <Disc3 className="w-4 h-4 ${t.accent} animate-spin" />
                    : i + 1}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className={\`text-sm font-medium truncate \${currentTrack?.id === track.id ? '${t.accent}' : ''}\`}>{track.title}</p>
                  <p className="text-xs ${t.textMuted} truncate">{track.artist} · {track.album}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleLike(track.id); }}
                  className={\`p-1 \${liked.has(track.id) ? 'text-red-500' : '${t.textMuted}'}\`}>
                  <Heart className={\`w-3.5 h-3.5 \${liked.has(track.id) ? 'fill-current' : ''}\`} />
                </button>
                <span className="text-xs ${t.textMuted} w-10 text-right">{formatTime(track.duration)}</span>
              </div>
            ))}
          </div>

          {filtered.length === 0 && view !== 'queue' && (
            <div className="text-center py-16 ${t.textMuted}">
              <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No tracks found</p>
            </div>
          )}
        </div>
      </div>

      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="${t.card} border-t ${t.cardBorder}">
          {/* Progress Bar */}
          <div className="px-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] ${t.textMuted} w-8 text-right">{formatTime(progress)}</span>
              <div className="flex-1 h-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} cursor-pointer group" onClick={seekTo}>
                <div className="${t.primary} h-full rounded-full relative transition-all"
                  style={{ width: (progress / currentTrack.duration * 100) + '%' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${t.primary} opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
              <span className="text-[10px] ${t.textMuted} w-8">{formatTime(currentTrack.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center shrink-0">
                <Disc3 className={\`w-5 h-5 ${t.accent} \${isPlaying ? 'animate-spin' : ''}\`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{currentTrack.title}</p>
                <p className="text-xs ${t.textMuted} truncate">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setIsShuffle(!isShuffle)} className={\`p-1.5 rounded \${isShuffle ? '${t.accent}' : '${t.textMuted}'}\`}>
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={playPrev} className="p-1.5 rounded hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'}">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 rounded-full ${t.primary} text-white hover:opacity-90">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={playNext} className="p-1.5 rounded hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'}">
                <SkipForward className="w-4 h-4" />
              </button>
              <button onClick={() => setIsRepeat(!isRepeat)} className={\`p-1.5 rounded \${isRepeat ? '${t.accent}' : '${t.textMuted}'}\`}>
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 flex-1 justify-end">
              <button onClick={() => setIsMuted(!isMuted)} className="p-1 ${t.textMuted}">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input type="range" min="0" max="100" value={isMuted ? 0 : volume}
                onChange={e => { setVolume(Number(e.target.value)); setIsMuted(false); }}
                className="w-20 h-1 accent-current ${t.accent}" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;
}
