/**
 * Chat / Inbox Kit Renderer
 * Generates a support inbox / messaging workspace App.tsx
 */

import type { AppSpec } from '../../shells/spec.js';
import { getThemeById } from '../../shells/themes.js';

export function renderChatInboxKit(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');

  const conversations = spec.seedData.map((s, i) => ({
    id: i + 1,
    name: s.name,
    preview: s.description,
    status: s.status,
    priority: s.priority,
    assignee: s.assignee,
    category: s.category,
    unread: s.status === 'active' ? Math.floor(Math.random() * 5) + 1 : 0,
    time: `${Math.floor(Math.random() * 12) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
  }));

  return `import { useState, useMemo } from 'react';
import {
  Search, Send, Inbox, Tag, User, Clock, ChevronDown, Star,
  MoreHorizontal, Paperclip, Filter, CheckCircle2, AlertCircle,
  MessageSquare, X, Menu, ArrowLeft, Hash
} from 'lucide-react';

// ── Types ──
interface Conversation {
  id: number;
  name: string;
  preview: string;
  status: 'active' | 'pending' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  category: string;
  unread: number;
  time: string;
  messages: Message[];
}

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isAgent: boolean;
}

// ── Data ──
const INITIAL_CONVERSATIONS: Conversation[] = ${JSON.stringify(conversations)}.map((c: Omit<Conversation, 'messages'>, i: number) => ({
  ...c,
  messages: [
    { id: 1, sender: c.name, text: c.preview, time: '10:00 AM', isAgent: false },
    { id: 2, sender: 'Support Agent', text: 'Thank you for reaching out. Let me look into this for you.', time: '10:05 AM', isAgent: true },
    { id: 3, sender: c.name, text: 'Any updates on this?', time: '10:30 AM', isAgent: false },
  ],
}));

const CATEGORIES = ${JSON.stringify(spec.categories)};

const statusColors: Record<string, string> = {
  ${isDark
    ? `active: 'bg-emerald-900/50 text-emerald-300', pending: 'bg-amber-900/50 text-amber-300', completed: 'bg-blue-900/50 text-blue-300', archived: 'bg-gray-800 text-gray-400'`
    : `active: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', completed: 'bg-blue-100 text-blue-700', archived: 'bg-gray-100 text-gray-500'`}
};

const priorityDot: Record<string, string> = {
  high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-gray-400'
};

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [showMobileList, setShowMobileList] = useState(true);

  const filtered = useMemo(() => {
    let result = conversations;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus);
    }
    return result;
  }, [conversations, search, filterStatus]);

  const selected = conversations.find(c => c.id === selectedId) || null;

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedId) return;
    setConversations(prev => prev.map(c => {
      if (c.id !== selectedId) return c;
      return {
        ...c,
        messages: [...c.messages, {
          id: c.messages.length + 1,
          sender: 'Support Agent',
          text: newMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAgent: true,
        }],
      };
    }));
    setNewMessage('');
  };

  const markResolved = (id: number) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'completed' as const, unread: 0 } : c
    ));
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="h-screen flex flex-col ${t.bg} ${t.text}">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b ${t.cardBorder} ${t.card}">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-1" onClick={() => setShowMobileList(!showMobileList)}>
            <Menu className="w-5 h-5" />
          </button>
          <Inbox className="w-5 h-5 ${t.accent}" />
          <h1 className="text-lg font-bold">${spec.appName}</h1>
          {totalUnread > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full ${t.primary} text-white">{totalUnread}</span>
          )}
        </div>
        <p className="text-sm ${t.textMuted} hidden sm:block">${spec.tagline}</p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className={\`\${showMobileList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r ${t.cardBorder} ${t.card}\`}>
          {/* Search + Filter */}
          <div className="p-3 space-y-2 border-b ${t.cardBorder}">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none"
              />
            </div>
            <div className="flex gap-1">
              {['all', 'active', 'pending', 'completed'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={\`px-2.5 py-1 text-xs rounded-full \${filterStatus === s ? '${t.primary} text-white' : '${isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}'}\`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center ${t.textMuted}">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No conversations found</p>
              </div>
            ) : filtered.map(conv => (
              <button key={conv.id} onClick={() => { setSelectedId(conv.id); setShowMobileList(false); }}
                className={\`w-full text-left p-3 border-b ${t.cardBorder} hover:${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} transition \${selectedId === conv.id ? '${isDark ? 'bg-gray-800' : 'bg-blue-50'}' : ''}\`}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={\`w-2 h-2 rounded-full \${priorityDot[conv.priority]}\`} />
                    <span className="font-medium text-sm truncate max-w-[160px]">{conv.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs ${t.textMuted}">{conv.time}</span>
                    {conv.unread > 0 && (
                      <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${t.primary} text-white">{conv.unread}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs ${t.textMuted} truncate">{conv.preview}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={\`px-1.5 py-0.5 text-[10px] rounded \${statusColors[conv.status]}\`}>{conv.status}</span>
                  <span className="text-[10px] ${t.textMuted}"><User className="w-3 h-3 inline" /> {conv.assignee}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread Panel */}
        <div className={\`\${!showMobileList ? 'flex' : 'hidden'} md:flex flex-1 flex-col\`}>
          {selected ? (
            <>
              {/* Thread Header */}
              <div className="flex items-center justify-between p-3 border-b ${t.cardBorder} ${t.card}">
                <div className="flex items-center gap-3">
                  <button className="md:hidden p-1" onClick={() => setShowMobileList(true)}>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-semibold text-sm">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={\`px-1.5 py-0.5 text-[10px] rounded \${statusColors[selected.status]}\`}>{selected.status}</span>
                      <span className="text-[10px] ${t.textMuted}">#{selected.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selected.status !== 'completed' && (
                    <button onClick={() => markResolved(selected.id)}
                      className="px-3 py-1.5 text-xs rounded-lg ${isDark ? 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} transition">
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Resolve
                    </button>
                  )}
                  <button className="p-1.5 rounded hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'}">
                    <MoreHorizontal className="w-4 h-4 ${t.textMuted}" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selected.messages.map(msg => (
                  <div key={msg.id} className={\`flex \${msg.isAgent ? 'justify-end' : 'justify-start'}\`}>
                    <div className={\`max-w-[75%] px-3 py-2 rounded-xl \${msg.isAgent
                      ? '${t.primary} text-white rounded-br-sm'
                      : '${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'} rounded-bl-sm'}\`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={\`text-[10px] mt-1 \${msg.isAgent ? 'text-white/60' : '${t.textMuted}'}\`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Composer */}
              <div className="p-3 border-t ${t.cardBorder} ${t.card}">
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'}">
                    <Paperclip className="w-4 h-4 ${t.textMuted}" />
                  </button>
                  <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a reply..."
                    className="flex-1 px-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none"
                  />
                  <button onClick={sendMessage}
                    className="p-2 rounded-lg ${t.primary} text-white hover:opacity-90 transition">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center ${t.textMuted}">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose from the list to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;
}
