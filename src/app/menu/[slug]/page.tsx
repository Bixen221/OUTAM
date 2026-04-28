'use client';
import { useEffect, useState, useRef } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

/* ─── Types ─── */
interface Restaurant {
  id: number;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  theme_color?: string;
}
interface Category { id: number; name: string; sort_order: number; }
interface Dish {
  id: number;
  name: string;
  description?: string;
  price: number;
  promo_price?: number;
  image_url?: string;
  category_id: number;
  is_available: boolean;
}
interface CartItem { dish: Dish; qty: number; }

/* ─── Composant principal ─── */
export default function MenuPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  /* ─── Panier ─── */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  /* ─── Charger le menu ─── */
  useEffect(() => { loadMenu(); }, [slug]);

  /* ─── Persister le panier dans localStorage par restaurant ─── */
  useEffect(() => {
    if (!restaurant) return;
    const saved = localStorage.getItem(`outam_cart_${restaurant.slug}`);
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch {}
    }
  }, [restaurant]);

  useEffect(() => {
    if (!restaurant) return;
    localStorage.setItem(`outam_cart_${restaurant.slug}`, JSON.stringify(cart));
  }, [cart, restaurant]);

  async function loadMenu() {
    const { data: resto } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!resto) { setNotFound(true); setLoading(false); return; }
    setRestaurant(resto);

    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', resto.id)
      .order('sort_order');
    setCategories(cats || []);

    const { data: items } = await supabase
      .from('dishes')
      .select('*')
      .eq('restaurant_id', resto.id)
      .eq('is_available', true)
      .order('name');
    setDishes(items || []);

    // Enregistrer le scan (non-bloquant, ignore les erreurs)
    supabase.from('menu_scans').insert({ restaurant_id: resto.id }).then(() => {});

    setLoading(false);
  }

  /* ─── Fonctions panier ─── */
  function addToCart(dish: Dish) {
    setCart(prev => {
      const existing = prev.find(i => i.dish.id === dish.id);
      if (existing) return prev.map(i => i.dish.id === dish.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { dish, qty: 1 }];
    });
  }

  function removeFromCart(dishId: number) {
    setCart(prev => {
      const existing = prev.find(i => i.dish.id === dishId);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter(i => i.dish.id !== dishId);
      return prev.map(i => i.dish.id === dishId ? { ...i, qty: i.qty - 1 } : i);
    });
  }

  function clearCart() {
    setCart([]);
  }

  function getCartQty(dishId: number) {
    return cart.find(i => i.dish.id === dishId)?.qty || 0;
  }

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + (i.dish.promo_price || i.dish.price) * i.qty, 0);

  /* ─── Télécharger en image ─── */
  async function downloadAsImage() {
    if (!receiptRef.current || !restaurant) return;

    // On utilise html2canvas via CDN dynamique
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(script);

    script.onload = async () => {
      const canvas = await (window as any).html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `commande-${restaurant.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setShowDownloadToast(true);
      setTimeout(() => setShowDownloadToast(false), 3000);
    };
  }

  /* ─── Filtres ─── */
  const filteredDishes = dishes.filter(d => {
    const matchCat = !activeCategory || d.category_id === activeCategory;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped: Record<string, Dish[]> = {};
  filteredDishes.forEach(d => {
    const cat = categories.find(c => c.id === d.category_id);
    const catName = cat?.name || 'Autres';
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push(d);
  });

  /* ─── Prix formaté ─── */
  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  const accentColor = restaurant?.theme_color || '#C8922A';

  /* ─── LOADING ─── */
  if (loading) return (
    <div className="min-h-screen bg-[#F7F3EC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${accentColor} transparent ${accentColor} ${accentColor}` }} />
        <p className="text-sm text-gray-400 font-light">Chargement du menu…</p>
      </div>
    </div>
  );

  /* ─── NOT FOUND ─── */
  if (notFound) return (
    <div className="min-h-screen bg-[#F7F3EC] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-5xl mb-4">🍽️</p>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Restaurant introuvable</h1>
        <p className="text-sm text-gray-500">Ce menu n'existe pas ou a été supprimé.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F3EC]" style={{ '--accent': accentColor, '--accent-light': accentColor + '22' } as React.CSSProperties}>

      {/* ─── HEADER RESTAURANT ─── */}
      <header className="relative overflow-hidden" style={{ background: '#0E0C09' }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 80% at 50% 0%, ${accentColor}22 0%, transparent 70%)` }} />
        <div className="relative z-10 px-5 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center text-2xl font-bold overflow-hidden mb-3"
            style={{ borderColor: accentColor + '66', color: accentColor, background: accentColor + '15' }}>
            {restaurant?.logo_url
              ? <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              : restaurant?.name?.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-white text-xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif' }}>{restaurant?.name}</h1>
          {restaurant?.description && <p className="text-gray-400 text-xs max-w-xs leading-relaxed mb-2">{restaurant.description}</p>}
          <div className="flex gap-4 text-xs text-gray-500">
            {restaurant?.address && <span>📍 {restaurant.address}</span>}
            {restaurant?.phone && <span>📞 {restaurant.phone}</span>}
          </div>
        </div>
      </header>

      {/* ─── BARRE DE RECHERCHE ─── */}
      <div className="sticky top-0 z-30 bg-[#F7F3EC]/95 backdrop-blur-sm border-b border-gray-200/50">
        <div className="px-4 py-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Rechercher un plat…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ '--tw-ring-color': accentColor } as any}
            />
          </div>
        </div>

        {/* ─── CATÉGORIES ─── */}
        {categories.length > 0 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!activeCategory ? 'text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              style={!activeCategory ? { background: accentColor } : {}}
            >
              Tous
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeCategory === cat.id ? 'text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                style={activeCategory === cat.id ? { background: accentColor } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── PLATS ─── */}
      <div className="px-4 py-4 pb-32">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm text-gray-400">Aucun plat trouvé</p>
          </div>
        ) : (
          Object.entries(grouped).map(([catName, items]) => (
            <div key={catName} className="mb-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
                {catName}
              </h2>
              <div className="space-y-2.5">
                {items.map(dish => {
                  const qty = getCartQty(dish.id);
                  const price = dish.promo_price || dish.price;
                  return (
                    <div
                      key={dish.id}
                      className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedDish(dish)}
                    >
                      {/* Image */}
                      <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center text-2xl">
                        {dish.image_url
                          ? <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                          : '🍽️'}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-800 truncate">{dish.name}</h3>
                            {dish.promo_price && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: '#e74c3c' }}>PROMO</span>}
                          </div>
                          {dish.description && <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{dish.description}</p>}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: accentColor }}>{fmt(price)}</span>
                            {dish.promo_price && <span className="text-xs text-gray-400 line-through">{fmt(dish.price)}</span>}
                          </div>

                          {/* Boutons +/- */}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {qty > 0 && (
                              <>
                                <button
                                  onClick={() => removeFromCart(dish.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-sm font-bold" style={{ color: accentColor }}>{qty}</span>
                              </>
                            )}
                            <button
                              onClick={() => addToCart(dish)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md hover:scale-110 transition-transform"
                              style={{ background: accentColor }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── BOUTON PANIER FLOTTANT ─── */}
      {totalItems > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 hover:scale-105 transition-transform"
          style={{ background: accentColor }}
        >
          <span className="relative">
            🛒
            <span className="absolute -top-2 -right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold" style={{ color: accentColor }}>
              {totalItems}
            </span>
          </span>
          <span className="font-semibold text-sm">Voir ma commande</span>
          <span className="text-sm font-bold opacity-90">• {fmt(totalPrice)}</span>
        </button>
      )}

      {/* ─── MODAL DÉTAIL PLAT ─── */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedDish(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slideUp max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Image plat */}
            {selectedDish.image_url ? (
              <div className="w-full h-56 overflow-hidden">
                <img src={selectedDish.image_url} alt={selectedDish.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-5xl">🍽️</div>
            )}

            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-800">{selectedDish.name}</h2>
                {selectedDish.promo_price && <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold" style={{ background: '#e74c3c' }}>PROMO</span>}
              </div>
              {selectedDish.description && <p className="text-sm text-gray-500 leading-relaxed mb-4">{selectedDish.description}</p>}

              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl font-bold" style={{ color: accentColor }}>{fmt(selectedDish.promo_price || selectedDish.price)}</span>
                {selectedDish.promo_price && <span className="text-base text-gray-400 line-through">{fmt(selectedDish.price)}</span>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                  <button
                    onClick={() => removeFromCart(selectedDish.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold bg-white text-gray-600 shadow-sm"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold text-lg" style={{ color: accentColor }}>{getCartQty(selectedDish.id)}</span>
                  <button
                    onClick={() => addToCart(selectedDish)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm"
                    style={{ background: accentColor }}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => { addToCart(selectedDish); setSelectedDish(null); }}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm shadow-md hover:opacity-90 transition"
                  style={{ background: accentColor }}
                >
                  Ajouter à ma commande
                </button>
              </div>
            </div>

            <button onClick={() => setSelectedDish(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-sm">✕</button>
          </div>
        </div>
      )}

      {/* ─── MODAL PANIER / LISTE DE COMMANDE ─── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slideUp max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header panier */}
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Ma commande</h2>
                <p className="text-xs text-gray-400">{totalItems} article{totalItems > 1 ? 's' : ''} • {restaurant?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                    Vider
                  </button>
                )}
                <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition">✕</button>
              </div>
            </div>

            {/* Liste des articles */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">🛒</p>
                  <p className="text-sm text-gray-400">Votre commande est vide</p>
                  <p className="text-xs text-gray-300 mt-1">Ajoutez des plats depuis le menu</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => {
                    const price = item.dish.promo_price || item.dish.price;
                    return (
                      <div key={item.dish.id} className="flex items-center gap-3 py-2">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-lg">
                          {item.dish.image_url
                            ? <img src={item.dish.image_url} alt={item.dish.name} className="w-full h-full object-cover" />
                            : '🍽️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-800 truncate">{item.dish.name}</h4>
                          <p className="text-xs" style={{ color: accentColor }}>{fmt(price)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => removeFromCart(item.dish.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-sm bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 transition"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                          <button
                            onClick={() => addToCart(item.dish)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-white transition hover:opacity-80"
                            style={{ background: accentColor }}
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-bold text-gray-800 w-24 text-right">{fmt(price * item.qty)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Récapitulatif + Actions */}
            {cart.length > 0 && (
              <div className="px-5 pb-5 pt-3 border-t border-gray-100 space-y-3">
                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-800">Total</span>
                  <span className="text-xl font-bold" style={{ color: accentColor }}>{fmt(totalPrice)}</span>
                </div>

                {/* Bouton télécharger en image */}
                <button
                  onClick={downloadAsImage}
                  className="w-full py-3 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  📸 Télécharger ma commande
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── REÇU CACHÉ (pour html2canvas) ─── */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div ref={receiptRef} style={{ width: 380, padding: 24, background: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
          {/* En-tête ticket */}
          <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '2px dashed #ddd', marginBottom: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 }}>{restaurant?.name}</div>
            <div style={{ fontSize: 11, color: '#888' }}>
              {restaurant?.address && <span>{restaurant.address}</span>}
              {restaurant?.phone && <span> • {restaurant.phone}</span>}
            </div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 8 }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' — '}
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Titre */}
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 }}>🛒 Ma commande</div>

          {/* Articles */}
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', color: '#888', fontWeight: 500 }}>Plat</th>
                <th style={{ textAlign: 'center', padding: '6px 0', color: '#888', fontWeight: 500, width: 40 }}>Qté</th>
                <th style={{ textAlign: 'right', padding: '6px 0', color: '#888', fontWeight: 500, width: 90 }}>Prix</th>
                <th style={{ textAlign: 'right', padding: '6px 0', color: '#888', fontWeight: 500, width: 100 }}>Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(item => {
                const price = item.dish.promo_price || item.dish.price;
                return (
                  <tr key={item.dish.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '8px 0', color: '#333', fontWeight: 500 }}>{item.dish.name}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center', color: '#666' }}>×{item.qty}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#888' }}>{fmt(price)}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#333', fontWeight: 600 }}>{fmt(price * item.qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ borderTop: '2px dashed #ddd', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 'bold', color: '#333' }}>TOTAL</span>
            <span style={{ fontSize: 18, fontWeight: 'bold', color: accentColor }}>{fmt(totalPrice)}</span>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 12, borderTop: '1px solid #eee' }}>
            <div style={{ fontSize: 10, color: '#aaa' }}>Généré par OUTAM — Menu digital</div>
            <div style={{ fontSize: 9, color: '#ccc', marginTop: 2 }}>outam.vercel.app</div>
          </div>
        </div>
      </div>

      {/* ─── TOAST ─── */}
      {showDownloadToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-fadeIn">
          ✅ Commande téléchargée !
        </div>
      )}

      {/* ─── Animations CSS ─── */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.35s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}  async function downloadCartImage() {
    setDownloading(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();
    const color = restaurant?.theme_color || '#3300FF';
    const now = new Date();

    // Header bar
    doc.setFillColor(color);
    doc.rect(0, 0, w, 35, 'F');

    // Restaurant name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(restaurant?.name || 'Restaurant', w / 2, 18, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' - ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    doc.text(dateStr, w / 2, 28, { align: 'center' });

    // Title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ma commande', 15, 50);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(cartItems.length + ' article' + (cartItems.length > 1 ? 's' : ''), w - 15, 50, { align: 'right' });

    // Separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(15, 55, w - 15, 55);

    // Items
    let y = 65;
    cartItems.forEach((item: any, i: number) => {
      if (i % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(10, y - 5, w - 20, 12, 'F');
      }

      // Qty
      doc.setTextColor(color);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(item.qty + 'x', 18, y + 2);

      // Name
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.text(item.name, 30, y + 2);

      // Price
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(item.subtotal.toLocaleString() + ' FCFA', w - 18, y + 2, { align: 'right' });

      y += 12;
    });

    // Separator before total
    y += 5;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(15, y, w - 15, y);

    // Total
    y += 12;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', 18, y);
    doc.setTextColor(color);
    doc.text(cartTotal.toLocaleString() + ' FCFA', w - 18, y, { align: 'right' });

    // Footer
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Menu cree avec Outam - outam.vercel.app', w / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    // Save
    doc.save('commande-' + (restaurant?.name || 'restaurant').replace(/\s+/g, '-').toLowerCase() + '.pdf');
    setDownloading(false);
  }ect, useState, useRef } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

/* ─── Types ─── */
interface Restaurant {
  id: number;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  theme_color?: string;
}
interface Category { id: number; name: string; sort_order: number; }
interface Dish {
  id: number;
  name: string;
  description?: string;
  price: number;
  promo_price?: number;
  image_url?: string;
  category_id: number;
  is_available: boolean;
}
interface CartItem { dish: Dish; qty: number; }

/* ─── Composant principal ─── */
export default function MenuPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  /* ─── Panier ─── */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  /* ─── Charger le menu ─── */
  useEffect(() => { loadMenu(); }, [slug]);

  /* ─── Persister le panier dans localStorage par restaurant ─── */
  useEffect(() => {
    if (!restaurant) return;
    const saved = localStorage.getItem(`outam_cart_${restaurant.slug}`);
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch {}
    }
  }, [restaurant]);

  useEffect(() => {
    if (!restaurant) return;
    localStorage.setItem(`outam_cart_${restaurant.slug}`, JSON.stringify(cart));
  }, [cart, restaurant]);

  async function loadMenu() {
    const { data: resto } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!resto) { setNotFound(true); setLoading(false); return; }
    setRestaurant(resto);

    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', resto.id)
      .order('sort_order');
    setCategories(cats || []);

    const { data: items } = await supabase
      .from('dishes')
      .select('*')
      .eq('restaurant_id', resto.id)
      .eq('is_available', true)
      .order('name');
    setDishes(items || []);

    // Enregistrer le scan (non-bloquant, ignore les erreurs)
    supabase.from('menu_scans').insert({ restaurant_id: resto.id }).then(() => {});

    setLoading(false);
  }

  /* ─── Fonctions panier ─── */
  function addToCart(dish: Dish) {
    setCart(prev => {
      const existing = prev.find(i => i.dish.id === dish.id);
      if (existing) return prev.map(i => i.dish.id === dish.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { dish, qty: 1 }];
    });
  }

  function removeFromCart(dishId: number) {
    setCart(prev => {
      const existing = prev.find(i => i.dish.id === dishId);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter(i => i.dish.id !== dishId);
      return prev.map(i => i.dish.id === dishId ? { ...i, qty: i.qty - 1 } : i);
    });
  }

  function clearCart() {
    setCart([]);
  }

  function getCartQty(dishId: number) {
    return cart.find(i => i.dish.id === dishId)?.qty || 0;
  }

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + (i.dish.promo_price || i.dish.price) * i.qty, 0);

  /* ─── Télécharger en image ─── */
  async function downloadAsImage() {
    if (!receiptRef.current || !restaurant) return;

    // On utilise html2canvas via CDN dynamique
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(script);

    script.onload = async () => {
      const canvas = await (window as any).html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `commande-${restaurant.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setShowDownloadToast(true);
      setTimeout(() => setShowDownloadToast(false), 3000);
    };
  }

  /* ─── Filtres ─── */
  const filteredDishes = dishes.filter(d => {
    const matchCat = !activeCategory || d.category_id === activeCategory;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped: Record<string, Dish[]> = {};
  filteredDishes.forEach(d => {
    const cat = categories.find(c => c.id === d.category_id);
    const catName = cat?.name || 'Autres';
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push(d);
  });

  /* ─── Prix formaté ─── */
  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  const accentColor = restaurant?.theme_color || '#C8922A';

  /* ─── LOADING ─── */
  if (loading) return (
    <div className="min-h-screen bg-[#F7F3EC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${accentColor} transparent ${accentColor} ${accentColor}` }} />
        <p className="text-sm text-gray-400 font-light">Chargement du menu…</p>
      </div>
    </div>
  );

  /* ─── NOT FOUND ─── */
  if (notFound) return (
    <div className="min-h-screen bg-[#F7F3EC] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-5xl mb-4">🍽️</p>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Restaurant introuvable</h1>
        <p className="text-sm text-gray-500">Ce menu n'existe pas ou a été supprimé.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F3EC]" style={{ '--accent': accentColor, '--accent-light': accentColor + '22' } as React.CSSProperties}>

      {/* ─── HEADER RESTAURANT ─── */}
      <header className="relative overflow-hidden" style={{ background: '#0E0C09' }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 80% at 50% 0%, ${accentColor}22 0%, transparent 70%)` }} />
        <div className="relative z-10 px-5 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center text-2xl font-bold overflow-hidden mb-3"
            style={{ borderColor: accentColor + '66', color: accentColor, background: accentColor + '15' }}>
            {restaurant?.logo_url
              ? <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              : restaurant?.name?.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-white text-xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif' }}>{restaurant?.name}</h1>
          {restaurant?.description && <p className="text-gray-400 text-xs max-w-xs leading-relaxed mb-2">{restaurant.description}</p>}
          <div className="flex gap-4 text-xs text-gray-500">
            {restaurant?.address && <span>📍 {restaurant.address}</span>}
            {restaurant?.phone && <span>📞 {restaurant.phone}</span>}
          </div>
        </div>
      </header>

      {/* ─── BARRE DE RECHERCHE ─── */}
      <div className="sticky top-0 z-30 bg-[#F7F3EC]/95 backdrop-blur-sm border-b border-gray-200/50">
        <div className="px-4 py-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Rechercher un plat…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ '--tw-ring-color': accentColor } as any}
            />
          </div>
        </div>

        {/* ─── CATÉGORIES ─── */}
        {categories.length > 0 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!activeCategory ? 'text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              style={!activeCategory ? { background: accentColor } : {}}
            >
              Tous
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeCategory === cat.id ? 'text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                style={activeCategory === cat.id ? { background: accentColor } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── PLATS ─── */}
      <div className="px-4 py-4 pb-32">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm text-gray-400">Aucun plat trouvé</p>
          </div>
        ) : (
          Object.entries(grouped).map(([catName, items]) => (
            <div key={catName} className="mb-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
                {catName}
              </h2>
              <div className="space-y-2.5">
                {items.map(dish => {
                  const qty = getCartQty(dish.id);
                  const price = dish.promo_price || dish.price;
                  return (
                    <div
                      key={dish.id}
                      className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedDish(dish)}
                    >
                      {/* Image */}
                      <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center text-2xl">
                        {dish.image_url
                          ? <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                          : '🍽️'}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-800 truncate">{dish.name}</h3>
                            {dish.promo_price && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: '#e74c3c' }}>PROMO</span>}
                          </div>
                          {dish.description && <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{dish.description}</p>}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: accentColor }}>{fmt(price)}</span>
                            {dish.promo_price && <span className="text-xs text-gray-400 line-through">{fmt(dish.price)}</span>}
                          </div>

                          {/* Boutons +/- */}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {qty > 0 && (
                              <>
                                <button
                                  onClick={() => removeFromCart(dish.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-sm font-bold" style={{ color: accentColor }}>{qty}</span>
                              </>
                            )}
                            <button
                              onClick={() => addToCart(dish)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md hover:scale-110 transition-transform"
                              style={{ background: accentColor }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── BOUTON PANIER FLOTTANT ─── */}
      {totalItems > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 hover:scale-105 transition-transform"
          style={{ background: accentColor }}
        >
          <span className="relative">
            🛒
            <span className="absolute -top-2 -right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold" style={{ color: accentColor }}>
              {totalItems}
            </span>
          </span>
          <span className="font-semibold text-sm">Voir ma commande</span>
          <span className="text-sm font-bold opacity-90">• {fmt(totalPrice)}</span>
        </button>
      )}

      {/* ─── MODAL DÉTAIL PLAT ─── */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedDish(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slideUp max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Image plat */}
            {selectedDish.image_url ? (
              <div className="w-full h-56 overflow-hidden">
                <img src={selectedDish.image_url} alt={selectedDish.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-5xl">🍽️</div>
            )}

            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-800">{selectedDish.name}</h2>
                {selectedDish.promo_price && <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold" style={{ background: '#e74c3c' }}>PROMO</span>}
              </div>
              {selectedDish.description && <p className="text-sm text-gray-500 leading-relaxed mb-4">{selectedDish.description}</p>}

              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl font-bold" style={{ color: accentColor }}>{fmt(selectedDish.promo_price || selectedDish.price)}</span>
                {selectedDish.promo_price && <span className="text-base text-gray-400 line-through">{fmt(selectedDish.price)}</span>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                  <button
                    onClick={() => removeFromCart(selectedDish.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold bg-white text-gray-600 shadow-sm"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold text-lg" style={{ color: accentColor }}>{getCartQty(selectedDish.id)}</span>
                  <button
                    onClick={() => addToCart(selectedDish)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm"
                    style={{ background: accentColor }}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => { addToCart(selectedDish); setSelectedDish(null); }}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm shadow-md hover:opacity-90 transition"
                  style={{ background: accentColor }}
                >
                  Ajouter à ma commande
                </button>
              </div>
            </div>

            <button onClick={() => setSelectedDish(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-sm">✕</button>
          </div>
        </div>
      )}

      {/* ─── MODAL PANIER / LISTE DE COMMANDE ─── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slideUp max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header panier */}
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Ma commande</h2>
                <p className="text-xs text-gray-400">{totalItems} article{totalItems > 1 ? 's' : ''} • {restaurant?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                    Vider
                  </button>
                )}
                <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition">✕</button>
              </div>
            </div>

            {/* Liste des articles */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">🛒</p>
                  <p className="text-sm text-gray-400">Votre commande est vide</p>
                  <p className="text-xs text-gray-300 mt-1">Ajoutez des plats depuis le menu</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => {
                    const price = item.dish.promo_price || item.dish.price;
                    return (
                      <div key={item.dish.id} className="flex items-center gap-3 py-2">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-lg">
                          {item.dish.image_url
                            ? <img src={item.dish.image_url} alt={item.dish.name} className="w-full h-full object-cover" />
                            : '🍽️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-800 truncate">{item.dish.name}</h4>
                          <p className="text-xs" style={{ color: accentColor }}>{fmt(price)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => removeFromCart(item.dish.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-sm bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 transition"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                          <button
                            onClick={() => addToCart(item.dish)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-white transition hover:opacity-80"
                            style={{ background: accentColor }}
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-bold text-gray-800 w-24 text-right">{fmt(price * item.qty)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Récapitulatif + Actions */}
            {cart.length > 0 && (
              <div className="px-5 pb-5 pt-3 border-t border-gray-100 space-y-3">
                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-800">Total</span>
                  <span className="text-xl font-bold" style={{ color: accentColor }}>{fmt(totalPrice)}</span>
                </div>

                {/* Bouton télécharger en image */}
                <button
                  onClick={downloadAsImage}
                  className="w-full py-3 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  📸 Télécharger ma commande
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── REÇU CACHÉ (pour html2canvas) ─── */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div ref={receiptRef} style={{ width: 380, padding: 24, background: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
          {/* En-tête ticket */}
          <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '2px dashed #ddd', marginBottom: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 }}>{restaurant?.name}</div>
            <div style={{ fontSize: 11, color: '#888' }}>
              {restaurant?.address && <span>{restaurant.address}</span>}
              {restaurant?.phone && <span> • {restaurant.phone}</span>}
            </div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 8 }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' — '}
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Titre */}
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 }}>🛒 Ma commande</div>

          {/* Articles */}
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', color: '#888', fontWeight: 500 }}>Plat</th>
                <th style={{ textAlign: 'center', padding: '6px 0', color: '#888', fontWeight: 500, width: 40 }}>Qté</th>
                <th style={{ textAlign: 'right', padding: '6px 0', color: '#888', fontWeight: 500, width: 90 }}>Prix</th>
                <th style={{ textAlign: 'right', padding: '6px 0', color: '#888', fontWeight: 500, width: 100 }}>Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(item => {
                const price = item.dish.promo_price || item.dish.price;
                return (
                  <tr key={item.dish.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '8px 0', color: '#333', fontWeight: 500 }}>{item.dish.name}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center', color: '#666' }}>×{item.qty}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#888' }}>{fmt(price)}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#333', fontWeight: 600 }}>{fmt(price * item.qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ borderTop: '2px dashed #ddd', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 'bold', color: '#333' }}>TOTAL</span>
            <span style={{ fontSize: 18, fontWeight: 'bold', color: accentColor }}>{fmt(totalPrice)}</span>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 12, borderTop: '1px solid #eee' }}>
            <div style={{ fontSize: 10, color: '#aaa' }}>Généré par OUTAM — Menu digital</div>
            <div style={{ fontSize: 9, color: '#ccc', marginTop: 2 }}>outam.vercel.app</div>
          </div>
        </div>
      </div>

      {/* ─── TOAST ─── */}
      {showDownloadToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-fadeIn">
          ✅ Commande téléchargée !
        </div>
      )}

      {/* ─── Animations CSS ─── */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.35s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
