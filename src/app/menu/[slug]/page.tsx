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
  const [isOffline, setIsOffline] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMenu(); }, [slug]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    setIsOffline(!navigator.onLine);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  // Scroll animation observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    const els = document.querySelectorAll('.fade-item');
    els.forEach(el => observer.observe(el));
    return () => els.forEach(el => observer.unobserve(el));
  });

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
    const now = new Date();
    const tc = restaurant?.theme_color || '#E0CD57';
    const r = parseInt(tc.slice(1, 3), 16), g = parseInt(tc.slice(3, 5), 16), b = parseInt(tc.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, w, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(restaurant?.name || 'Restaurant', w / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' - ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), w / 2, 28, { align: 'center' });
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ma commande', 15, 50);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(cartItems.length + ' article' + (cartItems.length > 1 ? 's' : ''), w - 15, 50, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(15, 55, w - 15, 55);
    let y = 65;
    cartItems.forEach((item: any, i: number) => {
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(10, y - 5, w - 20, 12, 'F'); }
      doc.setTextColor(r, g, b); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(item.qty + 'x', 18, y + 2);
      doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal');
      doc.text(item.name, 30, y + 2);
      doc.setTextColor(100, 100, 100); doc.setFontSize(10);
      doc.text(item.subtotal.toLocaleString() + ' FCFA', w - 18, y + 2, { align: 'right' });
      y += 12;
    });
    y += 5;
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.5); doc.line(15, y, w - 15, y);
    y += 12;
    doc.setTextColor(30, 30, 30); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Total', 18, y);
    doc.setTextColor(r, g, b);
    doc.text(cartTotal.toLocaleString() + ' FCFA', w - 18, y, { align: 'right' });
    doc.setTextColor(180, 180, 180); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Menu cree avec Outam - outam.vercel.app', w / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    doc.save('commande-' + (restaurant?.name || 'restaurant').replace(/\s+/g, '-').toLowerCase() + '.pdf');
    setDownloading(false);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(224,205,87,0.2)', borderTopColor: '#E0CD57', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Inter,sans-serif' }}>Chargement du menu...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter,sans-serif', textAlign: 'center', padding: 32 }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Restaurant introuvable</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Verifiez le lien ou le QR code</p>
      </div>
    </div>
  );

  const gold = '#E0CD57';
  const filtered = dishes.filter(d => {
    if (activeCategory && d.category_id !== activeCategory) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const grouped: Record<number, any[]> = {};
  filtered.forEach(d => { if (!grouped[d.category_id]) grouped[d.category_id] = []; grouped[d.category_id].push(d); });

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: "'Inter', sans-serif", paddingBottom: cartCount > 0 ? 90 : 0 }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-item { opacity: 0; transform: translateY(24px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .fade-item.visible { opacity: 1; transform: translateY(0); }
        .dish-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; transition: all 0.3s; }
        .dish-card:hover { border-color: rgba(224,205,87,0.3); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
        .dish-card:active { transform: scale(0.98); }
        .cat-tab { padding: 8px 18px; border-radius: 50px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: 'Inter', sans-serif; }
        .cat-active { background: #E0CD57; color: #0A0A0A; }
        .cat-inactive { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.08); }
        .cat-inactive:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
        .cart-btn-add { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: none; cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif; }
        .cart-btn-add:active { transform: scale(0.85); }
        .search-box { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 4px; display: flex; transition: border-color 0.2s; }
        .search-box:focus-within { border-color: rgba(224,205,87,0.4); }
        .search-input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 14px; padding: 10px 14px; font-family: 'Inter', sans-serif; }
        .search-input::placeholder { color: rgba(255,255,255,0.25); }
        .modal-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.7); backdrop-filter: blur(12px); display: flex; align-items: flex-end; justify-content: center; }
        .modal-box { background: #141414; border-top: 1px solid rgba(224,205,87,0.15); border-radius: 24px 24px 0 0; width: 100%; max-width: 500px; max-height: 85vh; overflow-y: auto; animation: fadeUp 0.3s ease; }
        @media(min-width:768px) { .modal-box { border-radius: 24px; border: 1px solid rgba(224,205,87,0.15); align-self: center; } .modal-overlay { align-items: center; } }
        .promo-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; background: rgba(224,205,87,0.15); color: #E0CD57; border: 1px solid rgba(224,205,87,0.2); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .gold-glow { box-shadow: 0 0 30px rgba(224,205,87,0.08); }
      `}</style>

      {/* Offline banner */}
      {isOffline && (
        <div style={{ background: '#92400E', textAlign: 'center', padding: 8, fontSize: 13, fontWeight: 500 }}>
          Mode hors-ligne
        </div>
      )}

      {/* Header */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(180deg, rgba(224,205,87,0.12) 0%, #0A0A0A 100%)', padding: '48px 20px 60px', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,205,87,0.06) 0%, transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {restaurant?.logo_url && (
              <img src={restaurant.logo_url} alt="" style={{ width: 72, height: 72, borderRadius: 20, objectFit: 'cover', margin: '0 auto 12px', display: 'block', border: '2px solid rgba(224,205,87,0.3)' }} />
            )}
            <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>{restaurant?.name}</h1>
            {restaurant?.description && <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>{restaurant.description}</p>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              {restaurant?.address && <span>📍 {restaurant.address}</span>}
              {restaurant?.phone && <span>📞 {restaurant.phone}</span>}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ maxWidth: 500, margin: '-24px auto 0', padding: '0 16px', position: 'relative', zIndex: 10 }}>
          <div className="search-box gold-glow">
            <input className="search-input" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un plat..." />
            {search && <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', padding: '0 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>}
          </div>
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div style={{ maxWidth: 500, margin: '16px auto 0', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            <button className={`cat-tab ${!activeCategory ? 'cat-active' : 'cat-inactive'}`} onClick={() => setActiveCategory(null)}>Tout</button>
            {categories.map(cat => (
              <button key={cat.id} className={`cat-tab ${activeCategory === cat.id ? 'cat-active' : 'cat-inactive'}`} onClick={() => setActiveCategory(cat.id)}>{cat.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Dishes */}
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 16px' }}>
        {Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <p>Aucun plat trouve</p>
          </div>
        ) : categories.filter(c => grouped[c.id]?.length).map(cat => (
          <div key={cat.id} style={{ marginBottom: 32 }}>
            <h2 className="fade-item" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 14, paddingLeft: 4, color: gold }}>{cat.name}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {grouped[cat.id].map((dish: any, i: number) => {
                const pa = isPromoActive(dish);
                const inCart = cart[dish.id] || 0;
                return (
                  <div key={dish.id} className="dish-card fade-item" style={{ transitionDelay: `${i * 0.05}s`, borderColor: inCart > 0 ? 'rgba(224,205,87,0.4)' : undefined }}>
                    {/* Photo */}
                    {dish.image_url ? (
                      <div onClick={() => setSelectedDish(dish)} style={{ cursor: 'pointer', position: 'relative' }}>
                        <img src={dish.image_url} alt="" style={{ width: '100%', height: 180, objectFit: 'contain', display: 'block', background: '#111' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }} />
                        {pa && <div className="promo-badge" style={{ position: 'absolute', top: 10, right: 10 }}>PROMO</div>}
                        {inCart > 0 && <div style={{ position: 'absolute', top: 10, left: 10, width: 24, height: 24, borderRadius: '50%', background: gold, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{inCart}</div>}
                      </div>
                    ) : (
                      <div onClick={() => setSelectedDish(dish)} style={{ cursor: 'pointer', height: 100, background: 'rgba(224,205,87,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, position: 'relative' }}>
                        🍽️
                        {pa && <div className="promo-badge" style={{ position: 'absolute', top: 10, right: 10 }}>PROMO</div>}
                      </div>
                    )}
                    {/* Info */}
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div onClick={() => setSelectedDish(dish)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{dish.name}</h3>
                        {dish.description && <p className="line-clamp-2" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, lineHeight: 1.5 }}>{dish.description}</p>}
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {pa ? (
                            <>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecoration: 'line-through' }}>{dish.price.toLocaleString()} F</span>
                              <span style={{ color: gold, fontWeight: 700, fontSize: 16 }}>{dish.promo_price.toLocaleString()} F</span>
                            </>
                          ) : (
                            <span style={{ color: gold, fontWeight: 700, fontSize: 16 }}>{dish.price.toLocaleString()} F</span>
                          )}
                        </div>
                      </div>
                      {/* Cart controls */}
                      <div style={{ flexShrink: 0 }}>
                        {inCart > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button className="cart-btn-add" onClick={() => removeFromCart(dish.id)} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>-</button>
                            <span style={{ width: 22, textAlign: 'center', fontWeight: 700, fontSize: 14, color: gold }}>{inCart}</span>
                            <button className="cart-btn-add" onClick={() => addToCart(dish.id)} style={{ background: gold, color: '#0A0A0A' }}>+</button>
                          </div>
                        ) : (
                          <button className="cart-btn-add" onClick={() => addToCart(dish.id)} style={{ background: gold, color: '#0A0A0A', fontWeight: 700 }}>+</button>
                        )}
                      </div>
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
        <div className="modal-overlay" onClick={() => setSelectedDish(null)}>
          <div className="modal-box" onClick={(e: any) => e.stopPropagation()}>
            {selectedDish.image_url && <img src={selectedDish.image_url} alt="" style={{ width: '100%', height: 240, objectFit: 'contain', background: '#111' }} />}
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: 700, flex: 1 }}>{selectedDish.name}</h2>
                <button onClick={() => setSelectedDish(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, flexShrink: 0, marginLeft: 12 }}>✕</button>
              </div>
              {isPromoActive(selectedDish) ? (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', marginRight: 10, fontSize: 14 }}>{selectedDish.price.toLocaleString()} FCFA</span>
                  <span style={{ color: gold, fontWeight: 800, fontSize: 26 }}>{selectedDish.promo_price.toLocaleString()} FCFA</span>
                  <div className="promo-badge" style={{ marginLeft: 8, display: 'inline-flex' }}>PROMO</div>
                  {selectedDish.promo_expires_at && <p style={{ color: 'rgba(224,205,87,0.6)', fontSize: 11, marginTop: 4 }}>Jusqu au {new Date(selectedDish.promo_expires_at).toLocaleDateString('fr-FR')}</p>}
                </div>
              ) : (
                <p style={{ color: gold, fontWeight: 800, fontSize: 26, marginBottom: 16 }}>{selectedDish.price.toLocaleString()} FCFA</p>
              )}
              {selectedDish.description && <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{selectedDish.description}</p>}
              <button onClick={() => { addToCart(selectedDish.id); setSelectedDish(null); }} style={{ width: '100%', padding: 14, borderRadius: 14, background: gold, color: '#0A0A0A', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                Ajouter a ma commande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart floating button */}
      {cartCount > 0 && !showCart && (
        <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 40, maxWidth: 500, margin: '0 auto' }}>
          <button onClick={() => setShowCart(true)} style={{ width: '100%', padding: '16px 20px', borderRadius: 16, background: gold, color: '#0A0A0A', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', cursor: 'pointer', boxShadow: '0 8px 30px rgba(224,205,87,0.25)', fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{cartCount}</span>
              <span>Voir ma commande</span>
            </div>
            <span style={{ fontWeight: 800 }}>{cartTotal.toLocaleString()} F</span>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div className="modal-overlay" onClick={() => setShowCart(false)}>
          <div ref={cartRef} className="modal-box" onClick={(e: any) => e.stopPropagation()}>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 20, fontWeight: 700 }}>Ma commande</h2>
                <button onClick={() => setShowCart(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>

              {cartItems.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0' }}>Votre commande est vide</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {cartItems.map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button className="cart-btn-add" onClick={() => removeFromCart(item.id)} style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14 }}>-</button>
                          <span style={{ width: 20, textAlign: 'center', fontWeight: 700, fontSize: 13, color: gold }}>{item.qty}</span>
                          <button className="cart-btn-add" onClick={() => addToCart(item.id)} style={{ width: 28, height: 28, background: gold, color: '#0A0A0A', fontSize: 14 }}>+</button>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 500, fontSize: 14 }}>{item.name}</p>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{getPrice(item).toLocaleString()} F x {item.qty}</p>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: gold, flexShrink: 0 }}>{item.subtotal.toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '2px solid rgba(224,205,87,0.2)', marginBottom: 20 }}>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>Total</span>
                    <span style={{ fontWeight: 800, fontSize: 22, color: gold }}>{cartTotal.toLocaleString()} FCFA</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={downloadCartPDF} disabled={downloading} style={{ width: '100%', padding: 14, borderRadius: 14, background: gold, color: '#0A0A0A', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: downloading ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
                      {downloading ? 'Telechargement...' : 'Telecharger ma commande (PDF)'}
                    </button>
                    <button onClick={clearCart} style={{ width: '100%', padding: 12, borderRadius: 14, background: 'transparent', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 13, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
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
      <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
        Menu cree avec <a href="/" style={{ color: gold, textDecoration: 'none' }}>Outam</a>
      </div>
    </div>
  );
}
