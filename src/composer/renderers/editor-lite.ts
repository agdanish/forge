/**
 * Editor-Lite / Canvas-Lite Kit Renderer
 * Generates a poster designer / wireframe / whiteboard-lite App.tsx
 * Single-user, constrained canvas with mock objects.
 */

import type { AppSpec } from '../../shells/spec.js';
import { getThemeById } from '../../shells/themes.js';

export function renderEditorLiteKit(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');

  return `import { useState, useMemo, useRef } from 'react';
import {
  Type, Square, Circle, Image, Minus, MousePointer2, Hand,
  ZoomIn, ZoomOut, Undo2, Redo2, Download, Layers, Palette,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Trash2,
  Copy, Eye, EyeOff, Lock, Unlock, Plus, X, Grid3X3, Menu,
  ChevronDown, Move, Maximize2
} from 'lucide-react';

// ── Types ──
interface CanvasObject {
  id: number;
  type: 'rect' | 'circle' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  text?: string;
  fontSize?: number;
  visible: boolean;
  locked: boolean;
  label: string;
}

type Tool = 'select' | 'rect' | 'circle' | 'text' | 'image';

// ── Templates ──
const TEMPLATES = [
  { name: 'Blank Canvas', objects: [] },
  { name: 'Social Post', objects: [
    { type: 'rect' as const, x: 50, y: 50, width: 400, height: 400, fill: '#6366f1', text: '', label: 'Background' },
    { type: 'text' as const, x: 100, y: 150, width: 300, height: 60, fill: '#ffffff', text: 'Your Title Here', fontSize: 32, label: 'Headline' },
    { type: 'text' as const, x: 100, y: 250, width: 300, height: 40, fill: '#e2e8f0', text: 'Add your description', fontSize: 16, label: 'Description' },
  ]},
  { name: 'Presentation', objects: [
    { type: 'rect' as const, x: 30, y: 30, width: 440, height: 300, fill: '#1e293b', text: '', label: 'Slide BG' },
    { type: 'text' as const, x: 60, y: 80, width: 380, height: 50, fill: '#f8fafc', text: 'Slide Title', fontSize: 28, label: 'Title' },
    { type: 'rect' as const, x: 60, y: 160, width: 180, height: 120, fill: '#334155', text: '', label: 'Content Block 1' },
    { type: 'rect' as const, x: 260, y: 160, width: 180, height: 120, fill: '#334155', text: '', label: 'Content Block 2' },
  ]},
  { name: 'Wireframe', objects: [
    { type: 'rect' as const, x: 30, y: 30, width: 440, height: 50, fill: '#e2e8f0', text: 'Navigation', fontSize: 14, label: 'Nav Bar' },
    { type: 'rect' as const, x: 30, y: 100, width: 440, height: 150, fill: '#f1f5f9', text: 'Hero Section', fontSize: 16, label: 'Hero' },
    { type: 'rect' as const, x: 30, y: 270, width: 140, height: 100, fill: '#e2e8f0', text: 'Card', fontSize: 12, label: 'Card 1' },
    { type: 'rect' as const, x: 180, y: 270, width: 140, height: 100, fill: '#e2e8f0', text: 'Card', fontSize: 12, label: 'Card 2' },
    { type: 'rect' as const, x: 330, y: 270, width: 140, height: 100, fill: '#e2e8f0', text: 'Card', fontSize: 12, label: 'Card 3' },
  ]},
];

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#1e293b', '#f8fafc', '#ffffff', '#000000'];

export default function App() {
  const nextIdRef = useRef(100);
  const [objects, setObjects] = useState<CanvasObject[]>(
    TEMPLATES[1].objects.map((o, i) => ({ ...o, id: i + 1, visible: true, locked: false, fontSize: o.fontSize || 16 }))
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const selected = objects.find(o => o.id === selectedId) || null;

  const addObject = (type: CanvasObject['type']) => {
    const obj: CanvasObject = {
      id: nextIdRef.current++,
      type,
      x: 100 + Math.random() * 100,
      y: 100 + Math.random() * 100,
      width: type === 'circle' ? 100 : type === 'text' ? 200 : 150,
      height: type === 'circle' ? 100 : type === 'text' ? 40 : 100,
      fill: type === 'text' ? '${isDark ? '#ffffff' : '#000000'}' : COLORS[Math.floor(Math.random() * 6)],
      text: type === 'text' ? 'New Text' : undefined,
      fontSize: type === 'text' ? 18 : undefined,
      visible: true,
      locked: false,
      label: type.charAt(0).toUpperCase() + type.slice(1) + ' ' + nextIdRef.current,
    };
    setObjects(prev => [...prev, obj]);
    setSelectedId(obj.id);
    setTool('select');
  };

  const updateObject = (id: number, updates: Partial<CanvasObject>) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const deleteObject = (id: number) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateObject = (id: number) => {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    const copy = { ...obj, id: nextIdRef.current++, x: obj.x + 20, y: obj.y + 20, label: obj.label + ' Copy' };
    setObjects(prev => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const loadTemplate = (idx: number) => {
    const tmpl = TEMPLATES[idx];
    setObjects(tmpl.objects.map((o, i) => ({ ...o, id: nextIdRef.current + i, visible: true, locked: false, fontSize: o.fontSize || 16 })));
    nextIdRef.current += tmpl.objects.length + 1;
    setSelectedId(null);
  };

  return (
    <div className="h-screen flex flex-col ${t.bg} ${t.text}">
      {/* Top Toolbar */}
      <header className="flex items-center justify-between px-3 py-2 ${t.card} border-b ${t.cardBorder}">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 ${t.accent}" />
          <h1 className="text-sm font-bold">${spec.appName}</h1>
        </div>
        <div className="flex items-center gap-1">
          {/* Tool buttons */}
          {([
            ['select', MousePointer2],
            ['rect', Square],
            ['circle', Circle],
            ['text', Type],
          ] as [Tool, any][]).map(([t2, Icon]) => (
            <button key={t2} onClick={() => { setTool(t2); if (t2 !== 'select') addObject(t2 as any); }}
              className={\`p-1.5 rounded \${tool === t2 ? '${t.primary} text-white' : 'hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'}'}\`}
              title={t2}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-px h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} mx-1" />
          <button onClick={() => setShowGrid(!showGrid)} className={\`p-1.5 rounded \${showGrid ? '${t.accent}' : '${t.textMuted}'}\`} title="Toggle grid">
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setPreviewMode(!previewMode)} className={\`p-1.5 rounded \${previewMode ? '${t.accent}' : '${t.textMuted}'}\`} title="Preview">
            {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <div className="w-px h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} mx-1" />
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 rounded hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'}">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs ${t.textMuted} w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 rounded hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'}">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Templates + Layers */}
        {!previewMode && (
          <div className="w-56 border-r ${t.cardBorder} ${t.card} flex flex-col overflow-hidden">
            {/* Templates */}
            <div className="p-3 border-b ${t.cardBorder}">
              <p className="text-xs font-semibold ${t.textMuted} mb-2">TEMPLATES</p>
              <div className="space-y-1">
                {TEMPLATES.map((tmpl, i) => (
                  <button key={i} onClick={() => loadTemplate(i)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'} transition">
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Layers */}
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-xs font-semibold ${t.textMuted} mb-2">LAYERS</p>
              <div className="space-y-0.5">
                {[...objects].reverse().map(obj => (
                  <div key={obj.id} onClick={() => setSelectedId(obj.id)}
                    className={\`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition cursor-pointer \${selectedId === obj.id ? '${isDark ? 'bg-gray-800' : 'bg-blue-50'}' : 'hover:${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}'}\`}>
                    {obj.type === 'rect' && <Square className="w-3 h-3 shrink-0" style={{ color: obj.fill }} />}
                    {obj.type === 'circle' && <Circle className="w-3 h-3 shrink-0" style={{ color: obj.fill }} />}
                    {obj.type === 'text' && <Type className="w-3 h-3 shrink-0" />}
                    {obj.type === 'image' && <Image className="w-3 h-3 shrink-0" />}
                    <span className="truncate">{obj.label}</span>
                    <span className="ml-auto flex gap-0.5">
                      <button onClick={e => { e.stopPropagation(); updateObject(obj.id, { visible: !obj.visible }); }}
                        className="${t.textMuted} hover:${t.accent}">
                        {obj.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-gray-200'} p-8"
          onClick={() => setSelectedId(null)}>
          <div className="relative ${isDark ? 'bg-gray-900' : 'bg-white'} shadow-2xl rounded-lg"
            style={{ width: 500 * zoom / 100, height: 500 * zoom / 100, transform: 'scale(1)' }}
            onClick={e => e.stopPropagation()}>
            {/* Grid */}
            {showGrid && !previewMode && (
              <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: 'linear-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#fff' : '#000'} 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }} />
            )}

            {/* Objects */}
            {objects.filter(o => o.visible).map(obj => (
              <div key={obj.id}
                onClick={e => { e.stopPropagation(); if (!previewMode) setSelectedId(obj.id); }}
                className={\`absolute cursor-pointer \${!previewMode && selectedId === obj.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''}\`}
                style={{
                  left: obj.x * zoom / 100,
                  top: obj.y * zoom / 100,
                  width: obj.width * zoom / 100,
                  height: obj.height * zoom / 100,
                }}>
                {obj.type === 'rect' && (
                  <div className="w-full h-full rounded" style={{ backgroundColor: obj.fill }}>
                    {obj.text && (
                      <div className="w-full h-full flex items-center justify-center text-white" style={{ fontSize: (obj.fontSize || 14) * zoom / 100 }}>
                        {obj.text}
                      </div>
                    )}
                  </div>
                )}
                {obj.type === 'circle' && (
                  <div className="w-full h-full rounded-full" style={{ backgroundColor: obj.fill }} />
                )}
                {obj.type === 'text' && (
                  <div style={{ color: obj.fill, fontSize: (obj.fontSize || 16) * zoom / 100 }} className="font-medium">
                    {obj.text}
                  </div>
                )}
                {obj.type === 'image' && (
                  <div className="w-full h-full rounded ${isDark ? 'bg-gray-700' : 'bg-gray-300'} flex items-center justify-center">
                    <Image className="w-6 h-6 ${t.textMuted}" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Properties Panel */}
        {!previewMode && selected && (
          <div className="w-60 border-l ${t.cardBorder} ${t.card} overflow-y-auto">
            <div className="p-3 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold ${t.textMuted}">PROPERTIES</p>
                <button onClick={() => setSelectedId(null)}><X className="w-3.5 h-3.5 ${t.textMuted}" /></button>
              </div>

              {/* Label */}
              <div>
                <label className="text-[10px] ${t.textMuted} uppercase">Label</label>
                <input value={selected.label} onChange={e => updateObject(selected.id, { label: e.target.value })}
                  className="w-full mt-1 px-2 py-1 text-xs rounded ${t.input} focus:outline-none" />
              </div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] ${t.textMuted}">X</label>
                  <input type="number" value={Math.round(selected.x)} onChange={e => updateObject(selected.id, { x: Number(e.target.value) })}
                    className="w-full mt-0.5 px-2 py-1 text-xs rounded ${t.input} focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] ${t.textMuted}">Y</label>
                  <input type="number" value={Math.round(selected.y)} onChange={e => updateObject(selected.id, { y: Number(e.target.value) })}
                    className="w-full mt-0.5 px-2 py-1 text-xs rounded ${t.input} focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] ${t.textMuted}">W</label>
                  <input type="number" value={Math.round(selected.width)} onChange={e => updateObject(selected.id, { width: Number(e.target.value) })}
                    className="w-full mt-0.5 px-2 py-1 text-xs rounded ${t.input} focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] ${t.textMuted}">H</label>
                  <input type="number" value={Math.round(selected.height)} onChange={e => updateObject(selected.id, { height: Number(e.target.value) })}
                    className="w-full mt-0.5 px-2 py-1 text-xs rounded ${t.input} focus:outline-none" />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-[10px] ${t.textMuted} uppercase">Color</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {COLORS.map(color => (
                    <button key={color} onClick={() => updateObject(selected.id, { fill: color })}
                      className={\`w-6 h-6 rounded-full border-2 \${selected.fill === color ? 'border-blue-500' : 'border-transparent'}\`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

              {/* Text props */}
              {selected.type === 'text' && (
                <div>
                  <label className="text-[10px] ${t.textMuted} uppercase">Text</label>
                  <input value={selected.text || ''} onChange={e => updateObject(selected.id, { text: e.target.value })}
                    className="w-full mt-1 px-2 py-1 text-xs rounded ${t.input} focus:outline-none" />
                  <label className="text-[10px] ${t.textMuted} uppercase mt-2 block">Font Size</label>
                  <input type="number" value={selected.fontSize || 16} onChange={e => updateObject(selected.id, { fontSize: Number(e.target.value) })}
                    className="w-full mt-0.5 px-2 py-1 text-xs rounded ${t.input} focus:outline-none" />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-1 pt-2 border-t ${t.cardBorder}">
                <button onClick={() => duplicateObject(selected.id)}
                  className="flex-1 px-2 py-1.5 text-xs rounded ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} flex items-center justify-center gap-1">
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button onClick={() => deleteObject(selected.id)}
                  className="flex-1 px-2 py-1.5 text-xs rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`;
}
