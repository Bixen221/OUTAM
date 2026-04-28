'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import jsPDF from 'jspdf';

export default function MenuPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDish, setSelectedDish] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMenu(); }, [slug]);

  async function loadMenu() {
    const { data: resto } = await supabase.from('restaurants').select('*').eq('slug', slug).single();
    if (!resto) { setNotFound(true); setLoading(false); return; }
    setRestaurant(resto);
    await supabase.from('menu_scans').insert({ restaurant_id: resto.id, user_agent: navigator.userAgent || '' });
    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', resto.id).eq('is_active', true).order('sort_order');
    setCategories(cats || []);
    const { data: d } = await supabase.from('dishes').select('*').eq('restaurant_id', resto.id).eq('is_available', true).order('sort_order');
    setDishes(d || []);
    setLoading(false);
  }

  function isPromoActive(dish: any) { return dish.promo_price && (!dish.promo_expires_at || new Date(dish.promo_expires_at) > new Date()); }
  function getPrice(dish: any) { return isPromoActive(dish) ? dish.promo_price : dish.price; }

  function addToCart(dishId: number) { setCart(prev => ({ ...prev, [dishId]: (prev[dishId] || 0) + 1 })); }
  function removeFromCart(dishId: number) {
    setCart(prev => {
      const n = { ...prev };
      if (n[dishId] > 1) n[dishId]--;
      else delete n[dishId];
      return n;
    });
  }
  function clearCart() { setCart({}); setShowCart(false); }

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const dish = dishes.find(d => d.id === parseInt(id));
    return dish ? { ...dish, qty, subtotal: getPrice(dish) * qty } : null;
  }).filter(Boolean) as any[];
  const cartTotal = cartItems.reduce((sum: number, item: any) => sum + item.subtotal, 0);
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  async function downloadCartPDF() {
    setDownloading(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();
    const themeColor = restaurant?.theme_color || '#3300FF';
    const now = new Date();

    // Parse hex color to RGB
    const r = parseInt(themeColor.slice(1, 3), 16);
    const g = parseInt(themeColor.slice(3, 5), 16);
    const b = parseInt(themeColor.slice(5, 7), 16);

    // Header bar
    doc.setFillColor(r, g, b);
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

      doc.setTextColor(r, g, b);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(item.qty + 'x', 18, y + 2);

      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.text(item.name, 30, y + 2);

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
    doc.setTextColor(r, g, b);
    doc.text(cartTotal.toLocaleString() + ' FCFA', w - 18, y, { align: 'right' });

    // Footer
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Menu cree avec Outam - outam.vercel.app', w / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save('commande-' + (restaurant?.name || 'restaurant').replace(/\s+/g, '-').toLowerCase() + '.pdf');
    setDownloading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 bg-[#FAFAF8]"><div className="text-center"><div className="text-3xl mb-2">🍽️</div>Chargement du menu...</div></div>;
  if (notFound) return <div className="min-h-screen flex items-center justify-center text-gray-400 bg-[#FAFAF8]"><div className="text-center"><div className="text-3xl mb-2">😕</div><p className="font-bold text-lg text-gray-600">Restaurant introuvable</p><p className="text-sm mt-1">Verifiez le lien ou le QR code</p></div></div>;

  const color = restaurant?.theme_color || '#3300FF';
  const filtered = dishes.filter(d => {
    if (activeCategory && d.category_id !== activeCategory) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const grouped: Record<number, any[]> = {};
  filtered.forEach(d => { if (!grouped[d.category_id]) grouped[d.category_id] = []; grouped[d.category_id].push(d); });

  return (
    <div className="min-h-screen bg-[#FAFAF8]" style={{ paddingBottom: cartCount > 0 ? '80px' : '0' }}>
      {/* Header */}
      <div className="text-white py-8 px-5 text-center relative overflow-hidden" style={{ background: color }}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          {restaurant?.logo_url && <img src={restaurant.logo_url} alt="" className="w-16 h-16 rounded-2xl mx-auto mb-3 border-2 border-white/30 object-cover" />}
          <h1 className="font-display text-2xl md:text-3xl font-bold">{restaurant?.name}</h1>
          {restaurant?.description && <p className="text-white/70 text-sm mt-1 max-w-md mx-auto">{restaurant.description}</p>}
          {restaurant?.address && <p className="text-white/50 text-xs mt-2">📍 {restaurant.address}</p>}
          {restaurant?.phone && <p className="text-white/50 text-xs mt-1">📞 {restaurant.phone}</p>}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-lg mx-auto px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un plat..." className="flex-1 px-4 py-2 outline-none text-sm bg-transparent" />
          {search && <button onClick={() => setSearch('')} className="text-gray-400 px-3 text-sm">✕</button>}
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setActiveCategory(null)} className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all" style={!activeCategory ? { background: color, color: '#fff' } : { background: '#fff', color: '#6B6860', border: '1px solid #E8E6E0' }}>Tout</button>
            {categories.map((cat) => <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all" style={activeCategory === cat.id ? { background: color, color: '#fff' } : { background: '#fff', color: '#6B6860', border: '1px solid #E8E6E0' }}>{cat.name}</button>)}
          </div>
        </div>
      )}

      {/* Dishes */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12 text-gray-400"><p className="text-2xl mb-2">🔍</p><p>Aucun plat trouve</p></div>
        ) : categories.filter(c => grouped[c.id]?.length).map((cat) => (
          <div key={cat.id} className="mb-6">
            <h2 className="font-display text-lg font-bold mb-3 pl-1" style={{ color }}>{cat.name}</h2>
            <div className="space-y-2.5">
              {grouped[cat.id].map((dish: any) => {
                const pa = isPromoActive(dish);
                const inCart = cart[dish.id] || 0;
                return (
                  <div key={dish.id} className="bg-white rounded-2xl p-4 flex items-center gap-3.5 border border-gray-100 transition-all" style={inCart > 0 ? { borderColor: color, boxShadow: '0 0 0 1px ' + color + '20' } : {}}>
                    <div onClick={() => setSelectedDish(dish)} className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer active:scale-[0.98] transition-transform">
                      {dish.image_url ? <img src={dish.image_url} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" /> : <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: color + '10' }}>🍽️</div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[15px] leading-tight">{dish.name}</h3>
                          {pa && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold">PROMO</span>}
                        </div>
                        {dish.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{dish.description}</p>}
                        <div className="mt-1.5 flex items-center gap-2">
                          {pa ? (
                            <>
                              <span className="text-xs text-gray-400 line-through">{dish.price.toLocaleString()} F</span>
                              <span className="font-bold text-[15px] text-amber-500">{dish.promo_price.toLocaleString()} F</span>
                            </>
                          ) : (
                            <span className="font-bold text-[15px]" style={{ color }}>{dish.price.toLocaleString()} F</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {inCart > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => removeFromCart(dish.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold border border-gray-200 text-gray-400 active:scale-90 transition-transform">-</button>
                          <span className="w-6 text-center font-bold text-sm" style={{ color }}>{inCart}</span>
                          <button onClick={() => addToCart(dish.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold text-white active:scale-90 transition-transform" style={{ background: color }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(dish.id)} className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg active:scale-90 transition-transform" style={{ background: color }}>+</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dish detail modal */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setSelectedDish(null)}>
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {selectedDish.image_url && <img src={selectedDish.image_url} alt="" className="w-full h-56 object-cover rounded-t-3xl" />}
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-display text-xl font-bold leading-tight flex-1">{selectedDish.name}</h2>
                <button onClick={() => setSelectedDish(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 ml-3">x</button>
              </div>
              {isPromoActive(selectedDish) ? (
                <div className="mb-4">
                  <span className="text-sm text-gray-400 line-through mr-2">{selectedDish.price.toLocaleString()} FCFA</span>
                  <span className="text-2xl font-bold text-amber-500">{selectedDish.promo_price.toLocaleString()} FCFA</span>
                  <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold ml-2">PROMO</span>
                </div>
              ) : (
                <p className="text-2xl font-bold mb-4" style={{ color }}>{selectedDish.price.toLocaleString()} FCFA</p>
              )}
              {selectedDish.description && <p className="text-gray-500 text-sm leading-relaxed mb-4">{selectedDish.description}</p>}
              <button onClick={() => { addToCart(selectedDish.id); setSelectedDish(null); }} className="w-full py-3 rounded-2xl text-white font-semibold text-sm active:scale-[0.98] transition-transform" style={{ background: color }}>
                Ajouter a ma commande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart floating button */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <button onClick={() => setShowCart(true)} className="w-full py-4 px-6 rounded-2xl text-white font-semibold flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform" style={{ background: color }}>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">{cartCount}</span>
              <span>Voir ma commande</span>
            </div>
            <span className="font-bold">{cartTotal.toLocaleString()} F</span>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setShowCart(false)}>
          <div ref={cartRef} className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display text-xl font-bold">Ma commande</h2>
                <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">x</button>
              </div>

              {cartItems.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Votre commande est vide</p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {cartItems.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100">
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-full flex items-center justify-center text-sm border border-gray-200 text-gray-400 active:scale-90">-</button>
                          <span className="w-5 text-center font-bold text-sm" style={{ color }}>{item.qty}</span>
                          <button onClick={() => addToCart(item.id)} className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-white active:scale-90" style={{ background: color }}>+</button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">{getPrice(item).toLocaleString()} F x {item.qty}</p>
                        </div>
                        <span className="font-bold text-sm" style={{ color }}>{item.subtotal.toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between py-3 border-t-2 border-gray-200 mb-6">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-xl" style={{ color }}>{cartTotal.toLocaleString()} FCFA</span>
                  </div>

                  <div className="space-y-3">
                    <button onClick={downloadCartPDF} disabled={downloading} className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50" style={{ background: color }}>
                      {downloading ? 'Telechargement...' : '📥 Telecharger ma commande (PDF)'}
                    </button>
                    <button onClick={clearCart} className="w-full py-3 rounded-2xl border border-gray-200 text-gray-500 font-medium text-sm active:scale-[0.98] transition-transform">
                      Vider ma commande
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-6 text-xs text-gray-300">Menu cree avec <a href="/" className="text-brand-500 hover:underline font-medium">Outam</a></div>
      <style jsx>{`.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}`}</style>
    </div>
  );
}
