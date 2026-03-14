/**
 * Store / Catalog / Cart Kit Renderer
 * Generates an e-commerce / ordering App.tsx
 */

import type { AppSpec } from '../../shells/spec.js';
import { getThemeById } from '../../shells/themes.js';

export function renderStoreCatalogKit(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');

  return `import { useState, useMemo } from 'react';
import {
  ShoppingCart, Search, Filter, Star, Plus, Minus, X, Heart,
  ChevronDown, Grid3X3, List, Eye, Package, Truck, CreditCard,
  Check, ArrowLeft, Tag, Percent, Menu
} from 'lucide-react';

// ── Types ──
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  image: string;
  badge: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// ── Data ──
const CATEGORIES = ${JSON.stringify(spec.categories)};

const PRODUCTS: Product[] = ${JSON.stringify(spec.seedData.map((s, i) => ({
  id: i + 1,
  name: s.name,
  description: s.description,
  price: s.value > 1000 ? Math.round(s.value / 100) : s.value || 29,
  category: s.category,
  rating: (3.5 + Math.random() * 1.5),
  reviews: Math.floor(Math.random() * 200) + 10,
  inStock: s.status !== 'archived',
  image: '',
  badge: s.priority === 'high' ? 'Best Seller' : null,
})))};

export default function App() {
  const [products] = useState<Product[]>(PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCart, setShowCart] = useState(false);
  const [showDetail, setShowDetail] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCheckout, setShowCheckout] = useState(false);

  const filtered = useMemo(() => {
    let result = products;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }
    return result;
  }, [products, search, activeCategory]);

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      return newQty <= 0 ? c : { ...c, quantity: newQty };
    }).filter(c => c.quantity > 0));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  return (
    <div className="min-h-screen ${t.bg} ${t.text}">
      {/* Header */}
      <header className="sticky top-0 z-20 ${t.card} border-b ${t.cardBorder} px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 ${t.accent}" />
            <h1 className="text-lg font-bold">${spec.appName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-9 pr-3 py-1.5 rounded-lg ${t.input} text-sm w-56 focus:outline-none" />
            </div>
            <button onClick={() => setShowCart(true)} className="relative p-2 rounded-lg hover:${isDark ? 'bg-gray-800' : 'bg-gray-100'}">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${t.primary} text-white">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Mobile Search */}
        <div className="sm:hidden mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 rounded-lg ${t.input} text-sm focus:outline-none" />
        </div>

        {/* Category Chips + View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5 overflow-x-auto">
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
          <div className="flex gap-1 ml-2">
            <button onClick={() => setViewMode('grid')} className={\`p-1.5 rounded \${viewMode === 'grid' ? '${t.primary} text-white' : '${t.textMuted}'}\`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={\`p-1.5 rounded \${viewMode === 'list' ? '${t.primary} text-white' : '${t.textMuted}'}\`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Grid / List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 ${t.textMuted}">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products found</p>
          </div>
        ) : (
          <div className={\`\${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}\`}>
            {filtered.map(product => (
              <div key={product.id} className={\`${t.card} border ${t.cardBorder} rounded-xl overflow-hidden hover:shadow-lg transition cursor-pointer \${viewMode === 'list' ? 'flex' : ''}\`}
                onClick={() => setShowDetail(product)}>
                {/* Image placeholder */}
                <div className={\`\${viewMode === 'list' ? 'w-24 h-24' : 'aspect-square'} ${isDark ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center relative\`}>
                  <Package className="w-8 h-8 ${t.textMuted} opacity-30" />
                  {product.badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-full ${t.primary} text-white">{product.badge}</span>
                  )}
                </div>
                <div className="p-3 flex-1">
                  <h3 className="font-medium text-sm truncate">{product.name}</h3>
                  <p className="text-xs ${t.textMuted} mt-0.5 line-clamp-1">{product.description}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs">{product.rating.toFixed(1)}</span>
                    <span className="text-xs ${t.textMuted}">({product.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-sm">\${product.price}</span>
                    <button onClick={e => { e.stopPropagation(); addToCart(product); }}
                      className="px-2 py-1 text-xs rounded-lg ${t.primary} text-white hover:opacity-90">
                      <Plus className="w-3 h-3 inline" /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDetail(null)}>
          <div className={\`${t.card} rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto\`} onClick={e => e.stopPropagation()}>
            <div className="aspect-video ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-t-2xl flex items-center justify-center">
              <Package className="w-16 h-16 ${t.textMuted} opacity-20" />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold">{showDetail.name}</h2>
                <button onClick={() => setShowDetail(null)} className="p-1"><X className="w-5 h-5 ${t.textMuted}" /></button>
              </div>
              <p className="text-sm ${t.textMuted} mt-2">{showDetail.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{showDetail.rating.toFixed(1)}</span>
                <span className="text-sm ${t.textMuted}">({showDetail.reviews} reviews)</span>
                <span className="px-2 py-0.5 text-xs rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}">{showDetail.category}</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t ${t.cardBorder}">
                <span className="text-2xl font-bold">\${showDetail.price}</span>
                <button onClick={() => { addToCart(showDetail); setShowDetail(null); }}
                  className="px-6 py-2 rounded-xl ${t.primary} text-white font-medium hover:opacity-90">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/50" onClick={() => setShowCart(false)}>
          <div className={\`${t.card} w-full max-w-md h-full flex flex-col\`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b ${t.cardBorder}">
              <h2 className="font-bold text-lg">Cart ({cartCount})</h2>
              <button onClick={() => setShowCart(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 ${t.textMuted}">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Your cart is empty</p>
                </div>
              ) : cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}">
                  <div className="w-14 h-14 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 ${t.textMuted} opacity-40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-sm ${t.accent} font-bold">\${item.product.price}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 rounded ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 rounded ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-red-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t ${t.cardBorder}">
                <div className="flex justify-between mb-3">
                  <span className="${t.textMuted}">Subtotal</span>
                  <span className="font-bold">\${cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={() => { setShowCheckout(true); setShowCart(false); }}
                  className="w-full py-3 rounded-xl ${t.primary} text-white font-medium hover:opacity-90 flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" /> Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Summary */}
      {showCheckout && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCheckout(false)}>
          <div className={\`${t.card} rounded-2xl max-w-md w-full p-6\`} onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold">Order Summary</h2>
            </div>
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between py-2 border-b ${t.cardBorder}">
                <span className="text-sm">{item.product.name} × {item.quantity}</span>
                <span className="text-sm font-medium">\${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 font-bold">
              <span>Total</span>
              <span>\${cartTotal.toFixed(2)}</span>
            </div>
            <button onClick={() => { setShowCheckout(false); setCart([]); }}
              className="w-full py-3 mt-3 rounded-xl ${t.primary} text-white font-medium hover:opacity-90">
              Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}`;
}
