/**
 * Feed / Social Kit Renderer
 * Generates a community feed / social activity App.tsx
 */

import type { AppSpec } from '../../shells/spec.js';
import { getThemeById } from '../../shells/themes.js';

export function renderFeedSocialKit(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');

  return `import { useState, useMemo } from 'react';
import {
  Heart, MessageCircle, Share2, Bookmark, TrendingUp, Search,
  PlusCircle, Filter, ChevronDown, MoreHorizontal, ThumbsUp,
  Star, Eye, Clock, User, Hash, Menu, X, Send, ArrowUp
} from 'lucide-react';

// ── Types ──
interface Post {
  id: number;
  author: string;
  avatar: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  comments: Comment[];
  saves: number;
  views: number;
  time: string;
  liked: boolean;
  saved: boolean;
}

interface Comment {
  id: number;
  author: string;
  text: string;
  time: string;
  likes: number;
}

// ── Data ──
const CATEGORIES = ${JSON.stringify(spec.categories)};

const INITIAL_POSTS: Post[] = ${JSON.stringify(spec.seedData.map((s, i) => ({
  id: i + 1,
  author: s.assignee,
  avatar: s.assignee.split(' ').map((n: string) => n[0]).join(''),
  title: s.name,
  content: s.description,
  category: s.category,
  likes: Math.floor(Math.random() * 100) + 5,
  saves: Math.floor(Math.random() * 30),
  views: Math.floor(Math.random() * 500) + 50,
  time: `${Math.floor(Math.random() * 24)}h ago`,
  liked: false,
  saved: false,
})))}.map((p: any) => ({
  ...p,
  comments: [
    { id: 1, author: 'Alex Kim', text: 'Great post! Very insightful.', time: '2h ago', likes: 3 },
    { id: 2, author: 'Sarah Chen', text: 'I had a similar experience. Thanks for sharing!', time: '1h ago', likes: 1 },
  ],
}));

type FeedMode = 'latest' | 'trending' | 'following';

export default function App() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [feedMode, setFeedMode] = useState<FeedMode>('latest');
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const filtered = useMemo(() => {
    let result = [...posts];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.author.toLowerCase().includes(q));
    }
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }
    if (feedMode === 'trending') {
      result.sort((a, b) => b.likes - a.likes);
    }
    return result;
  }, [posts, search, activeCategory, feedMode]);

  const toggleLike = (id: number) => {
    setPosts(prev => prev.map(p => p.id === id
      ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
      : p
    ));
  };

  const toggleSave = (id: number) => {
    setPosts(prev => prev.map(p => p.id === id
      ? { ...p, saved: !p.saved, saves: p.saved ? p.saves - 1 : p.saves + 1 }
      : p
    ));
  };

  const addComment = (postId: number) => {
    if (!newComment.trim()) return;
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, comments: [...p.comments, { id: p.comments.length + 1, author: 'You', text: newComment, time: 'now', likes: 0 }] }
      : p
    ));
    setNewComment('');
  };

  const createPost = () => {
    if (!newTitle.trim()) return;
    const post: Post = {
      id: posts.length + 1,
      author: 'You',
      avatar: 'YO',
      title: newTitle,
      content: newContent,
      category: CATEGORIES[0],
      likes: 0, comments: [], saves: 0, views: 0,
      time: 'now', liked: false, saved: false,
    };
    setPosts([post, ...posts]);
    setNewTitle('');
    setNewContent('');
    setShowComposer(false);
  };

  return (
    <div className="min-h-screen ${t.bg} ${t.text}">
      {/* Header */}
      <header className="sticky top-0 z-10 ${t.card} border-b ${t.cardBorder} px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 ${t.accent}" />
            <h1 className="text-lg font-bold">${spec.appName}</h1>
          </div>
          <button onClick={() => setShowComposer(true)}
            className="px-3 py-1.5 text-sm rounded-lg ${t.primary} text-white hover:opacity-90 flex items-center gap-1">
            <PlusCircle className="w-4 h-4" /> Post
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-9 pr-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none" />
        </div>

        {/* Feed Mode Tabs */}
        <div className="flex gap-1 mb-4">
          {(['latest', 'trending', 'following'] as FeedMode[]).map(mode => (
            <button key={mode} onClick={() => setFeedMode(mode)}
              className={\`px-3 py-1.5 text-sm rounded-lg \${feedMode === mode ? '${t.primary} text-white' : '${isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}'}\`}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Category Chips */}
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

        {/* Composer Modal */}
        {showComposer && (
          <div className="mb-4 p-4 rounded-xl ${t.card} border ${t.cardBorder}">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Create Post</h3>
              <button onClick={() => setShowComposer(false)}><X className="w-4 h-4 ${t.textMuted}" /></button>
            </div>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Post title..."
              className="w-full px-3 py-2 mb-2 rounded-lg ${t.input} text-sm focus:outline-none" />
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="What's on your mind?"
              className="w-full px-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none h-20 resize-none" />
            <button onClick={createPost} className="mt-2 px-4 py-1.5 text-sm rounded-lg ${t.primary} text-white hover:opacity-90">
              Publish
            </button>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 ${t.textMuted}">
              <Hash className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No posts found</p>
            </div>
          ) : filtered.map(post => (
            <article key={post.id} className="p-4 rounded-xl ${t.card} border ${t.cardBorder}">
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full ${t.primary} text-white flex items-center justify-center text-xs font-bold">
                  {post.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{post.author}</p>
                  <p className="text-xs ${t.textMuted}">{post.time} · <span className="${t.accent}">{post.category}</span></p>
                </div>
                <button className="p-1 rounded hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'}">
                  <MoreHorizontal className="w-4 h-4 ${t.textMuted}" />
                </button>
              </div>

              {/* Post Content */}
              <h3 className="font-semibold mb-1">{post.title}</h3>
              <p className="text-sm ${t.textMuted} mb-3">{post.content}</p>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t ${t.cardBorder}">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleLike(post.id)} className={\`flex items-center gap-1.5 text-sm \${post.liked ? 'text-red-500' : '${t.textMuted}'} hover:text-red-500 transition\`}>
                    <Heart className={\`w-4 h-4 \${post.liked ? 'fill-current' : ''}\`} /> {post.likes}
                  </button>
                  <button onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    className="flex items-center gap-1.5 text-sm ${t.textMuted} hover:${t.accent} transition">
                    <MessageCircle className="w-4 h-4" /> {post.comments.length}
                  </button>
                  <span className="flex items-center gap-1 text-xs ${t.textMuted}">
                    <Eye className="w-3.5 h-3.5" /> {post.views}
                  </span>
                </div>
                <button onClick={() => toggleSave(post.id)} className={\`\${post.saved ? '${t.accent}' : '${t.textMuted}'} hover:${t.accent} transition\`}>
                  <Bookmark className={\`w-4 h-4 \${post.saved ? 'fill-current' : ''}\`} />
                </button>
              </div>

              {/* Comments */}
              {expandedPost === post.id && (
                <div className="mt-3 pt-3 border-t ${t.cardBorder} space-y-3">
                  {post.comments.map(c => (
                    <div key={c.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center text-[10px] font-bold shrink-0">
                        {c.author[0]}
                      </div>
                      <div>
                        <p className="text-xs"><span className="font-medium">{c.author}</span> <span className="${t.textMuted}">· {c.time}</span></p>
                        <p className="text-sm mt-0.5">{c.text}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input value={newComment} onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg ${t.input} focus:outline-none" />
                    <button onClick={() => addComment(post.id)} className="p-1.5 rounded-lg ${t.primary} text-white">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}`;
}
