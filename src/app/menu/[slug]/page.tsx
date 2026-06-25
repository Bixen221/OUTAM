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
  const [dark, setDark] = useState(true);
  const cartRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMenu(); }, [slug]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const off = () => setIsOffline(true);
    const on = () => setIsOffline(false);
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    setIsOffline(!navigator.onLine);
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); };
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fi').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });

  async function loadMenu() {
    const { data: r } = await supabase.from('restaurants').select('*').eq('slug', slug).single();
    if (!r) { setNotFound(true); setLoading(false); return; }
    setRestaurant(r);
    await supabase.from('menu_scans').insert({ restaurant_id: r.id, user_agent: navigator.userAgent || '' });
    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', r.id).eq('is_active', true).order('sort_order');
    setCategories(cats || []);
    const { data: d } = await supabase.from('dishes').select('*').eq('restaurant_id', r.id).eq('is_available', true).order('sort_order');
    setDishes(d || []);
    setLoading(false);
  }

  function isPro(d: any) { return d.promo_price && (!d.promo_expires_at || new Date(d.promo_expires_at) > new Date()); }
  function getP(d: any) { return isPro(d) ? d.promo_price : d.price; }
  function addC(id: number) { setCart(p => ({ ...p, [id]: (p[id] || 0) + 1 })); }
  function remC(id: number) { setCart(p => { const n = { ...p }; if (n[id] > 1) n[id]--; else delete n[id]; return n; }); }
  function clrC() { setCart({}); setShowCart(false); }

  const cItems = Object.entries(cart).map(([id, q]) => { const d = dishes.find(x => x.id === parseInt(id)); return d ? { ...d, qty: q, sub: getP(d) * q } : null; }).filter(Boolean) as any[];
  const cTotal = cItems.reduce((s: number, i: any) => s + i.sub, 0);
  const cCount = Object.values(cart).reduce((s, q) => s + q, 0);

  async function dlPDF() {
    setDownloading(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();
    const now = new Date();
    const tc = restaurant?.theme_color || '#E0CD57';
    const cr = parseInt(tc.slice(1, 3), 16), cg = parseInt(tc.slice(3, 5), 16), cb = parseInt(tc.slice(5, 7), 16);
    doc.setFillColor(cr, cg, cb); doc.rect(0, 0, w, 35, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text(restaurant?.name || '', w / 2, 18, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' - ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), w / 2, 28, { align: 'center' });
    doc.setTextColor(30, 30, 30); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Ma commande', 15, 50);
    doc.setFontSize(10); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal');
    doc.text(cItems.length + ' article' + (cItems.length > 1 ? 's' : ''), w - 15, 50, { align: 'right' });
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3); doc.line(15, 55, w - 15, 55);
    let y = 65;
    cItems.forEach((item: any, i: number) => {
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(10, y - 5, w - 20, 12, 'F'); }
      doc.setTextColor(cr, cg, cb); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(item.qty + 'x', 18, y + 2);
      doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); doc.text(item.name, 30, y + 2);
      doc.setTextColor(100, 100, 100); doc.setFontSize(10); doc.text(item.sub.toLocaleString() + ' FCFA', w - 18, y + 2, { align: 'right' });
      y += 12;
    });
    y += 5; doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.5); doc.line(15, y, w - 15, y); y += 12;
    doc.setTextColor(30, 30, 30); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('Total', 18, y);
    doc.setTextColor(cr, cg, cb); doc.text(cTotal.toLocaleString() + ' FCFA', w - 18, y, { align: 'right' });
    doc.setTextColor(180, 180, 180); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Menu cree avec Outam', w / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    doc.save('commande-' + (restaurant?.name || 'resto').replace(/\s+/g, '-').toLowerCase() + '.pdf');
    setDownloading(false);
  }

  // Theme colors
  const G = '#E0CD57';
  const BG = dark ? '#0A0A0A' : '#FAFAF8';
  const TX = dark ? '#ffffff' : '#1A1917';
  const TX2 = dark ? 'rgba(255,255,255,0.45)' : '#6B7280';
  const TX3 = dark ? 'rgba(255,255,255,0.3)' : '#9CA3AF';
  const CARD = dark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const CARDB = dark ? 'rgba(255,255,255,0.06)' : '#E5E7EB';
  const IMGBG = dark ? '#111111' : '#F3F4F6';
  const MODAL = dark ? '#141414' : '#ffffff';
  const INPUTBG = dark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const INPUTB = dark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  const BTNBG = dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6';
  const BTNC = dark ? '#ffffff' : '#374151';
  const PRC = dark ? G : '#1A1917';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(224,205,87,0.2)', borderTopColor: G, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Chargement du menu...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: 32 }}>
      <div><div style={{ fontSize: 48, marginBottom: 16 }}>😕</div><p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Restaurant introuvable</p><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Verifiez le lien ou le QR code</p></div>
    </div>
  );

  const filt = dishes.filter(d => {
    if (activeCategory && d.category_id !== activeCategory) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const grp: Record<number, any[]> = {};
  filt.forEach(d => { if (!grp[d.category_id]) grp[d.category_id] = []; grp[d.category_id].push(d); });

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TX, fontFamily: "'Inter',sans-serif", transition: 'background 0.4s, color 0.4s', paddingBottom: cCount > 0 ? 90 : 0 }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fi{opacity:0;transform:translateY(24px);transition:opacity 0.5s ease,transform 0.5s ease}
        .fi.vis{opacity:1;transform:translateY(0)}
        .lc2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      `}</style>

      {/* Theme toggle */}
      <button onClick={() => setDark(!dark)} style={{ position: 'fixed', top: 16, right: 16, zIndex: 45, width: 44, height: 44, borderRadius: '50%', border: `1px solid ${INPUTB}`, background: INPUTBG, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', transition: 'all 0.3s' }}>
        {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
      </button>

      {/* Offline */}
      {isOffline && <div style={{ background: '#92400E', textAlign: 'center', padding: 8, fontSize: 13, fontWeight: 500, color: '#fff' }}>Mode hors-ligne</div>}

      {/* Header */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ background: dark ? 'linear-gradient(180deg, rgba(224,205,87,0.12) 0%, #0A0A0A 100%)' : 'linear-gradient(180deg, rgba(224,205,87,0.1) 0%, #FAFAF8 100%)', padding: '48px 20px 60px', textAlign: 'center', transition: 'background 0.4s' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,205,87,0.06) 0%, transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {restaurant?.logo_url && <img src={restaurant.logo_url} alt="" style={{ width: 72, height: 72, borderRadius: 20, objectFit: 'cover', margin: '0 auto 12px', display: 'block', border: '2px solid rgba(224,205,87,0.3)' }} />}
            <h1 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 6 }}>{restaurant?.name}</h1>
            {restaurant?.description && <p style={{ color: TX2, fontSize: 14, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>{restaurant.description}</p>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: 12, color: TX3 }}>
              {restaurant?.address && <span>📍 {restaurant.address}</span>}
              {restaurant?.phone && <span>📞 {restaurant.phone}</span>}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ maxWidth: 500, margin: '-24px auto 0', padding: '0 16px', position: 'relative', zIndex: 10 }}>
          <div style={{ background: INPUTBG, border: `1px solid ${INPUTB}`, borderRadius: 14, padding: 4, display: 'flex', transition: 'all 0.3s', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un plat..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: TX, fontSize: 14, padding: '10px 14px', fontFamily: "'Inter',sans-serif" }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', color: TX3, padding: '0 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>}
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 1 && (
        <div style={{ maxWidth: 500, margin: '16px auto 0', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' as any }}>
            <button onClick={() => setActiveCategory(null)} style={{ padding: '8px 18px', borderRadius: 50, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as any, fontFamily: "'Inter',sans-serif", background: !activeCategory ? G : INPUTBG, color: !activeCategory ? '#0A0A0A' : TX3, transition: 'all 0.2s' }}>Tout</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ padding: '8px 18px', borderRadius: 50, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as any, fontFamily: "'Inter',sans-serif", background: activeCategory === cat.id ? G : INPUTBG, color: activeCategory === cat.id ? '#0A0A0A' : TX3, transition: 'all 0.2s' }}>{cat.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Dishes */}
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 16px' }}>
        {Object.keys(grp).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: TX3 }}><div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div><p>Aucun plat trouve</p></div>
        ) : categories.filter(c => grp[c.id]?.length).map(cat => (
          <div key={cat.id} style={{ marginBottom: 32 }}>
            <h2 className="fi" style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 14, paddingLeft: 4, color: G }}>{cat.name}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {grp[cat.id].map((dish: any, i: number) => {
                const pro = isPro(dish);
                const ic = cart[dish.id] || 0;
                return (
                  <div key={dish.id} className="fi" style={{ background: CARD, border: `1px solid ${ic > 0 ? 'rgba(224,205,87,0.4)' : CARDB}`, borderRadius: 16, overflow: 'hidden', transition: 'all 0.3s', transitionDelay: `${i * 0.05}s` }}>
                    {dish.image_url ? (
                      <div onClick={() => setSelectedDish(dish)} style={{ cursor: 'pointer', position: 'relative' }}>
                        <img src={dish.image_url} alt="" style={{ width: '100%', height: 180, objectFit: 'contain', display: 'block', background: IMGBG }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: dark ? 'linear-gradient(transparent, rgba(0,0,0,0.6))' : 'linear-gradient(transparent, rgba(0,0,0,0.05))' }} />
                        {pro && <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(224,205,87,0.15)', color: G, border: '1px solid rgba(224,205,87,0.2)' }}>PROMO</div>}
                        {ic > 0 && <div style={{ position: 'absolute', top: 10, left: 10, width: 24, height: 24, borderRadius: '50%', background: G, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{ic}</div>}
                      </div>
                    ) : (
                      <div onClick={() => setSelectedDish(dish)} style={{ cursor: 'pointer', height: 100, background: IMGBG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, position: 'relative' }}>🍽️</div>
                    )}
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div onClick={() => setSelectedDish(dish)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{dish.name}</h3>
                        {dish.description && <p className="lc2" style={{ color: TX2, fontSize: 12, lineHeight: 1.5 }}>{dish.description}</p>}
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {pro ? (<><span style={{ color: TX3, fontSize: 13, textDecoration: 'line-through' }}>{dish.price.toLocaleString()} F</span><span style={{ color: G, fontWeight: 700, fontSize: 16 }}>{dish.promo_price.toLocaleString()} F</span></>) : (<span style={{ color: PRC, fontWeight: 700, fontSize: 16 }}>{dish.price.toLocaleString()} F</span>)}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {ic > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => remC(dish.id)} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: 'none', cursor: 'pointer', background: BTNBG, color: BTNC, fontFamily: "'Inter',sans-serif" }}>-</button>
                            <span style={{ width: 22, textAlign: 'center' as any, fontWeight: 700, fontSize: 14, color: G }}>{ic}</span>
                            <button onClick={() => addC(dish.id)} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: 'none', cursor: 'pointer', background: G, color: '#0A0A0A', fontFamily: "'Inter',sans-serif" }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addC(dish.id)} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: 'none', cursor: 'pointer', background: G, color: '#0A0A0A', fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>+</button>
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

      {/* Dish detail */}
      {selectedDish && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setSelectedDish(null)}>
          <div style={{ background: MODAL, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' as any, animation: 'fadeUp 0.3s ease' }} onClick={(e: any) => e.stopPropagation()}>
            {selectedDish.image_url && <img src={selectedDish.image_url} alt="" style={{ width: '100%', height: 240, objectFit: 'contain', background: IMGBG }} />}
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 22, fontWeight: 700, flex: 1 }}>{selectedDish.name}</h2>
                <button onClick={() => setSelectedDish(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: BTNBG, border: 'none', color: TX3, cursor: 'pointer', fontSize: 16, flexShrink: 0, marginLeft: 12 }}>✕</button>
              </div>
              {isPro(selectedDish) ? (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: TX3, textDecoration: 'line-through', marginRight: 10, fontSize: 14 }}>{selectedDish.price.toLocaleString()} FCFA</span>
                  <span style={{ color: G, fontWeight: 800, fontSize: 26 }}>{selectedDish.promo_price.toLocaleString()} FCFA</span>
                  {selectedDish.promo_expires_at && <p style={{ color: 'rgba(224,205,87,0.6)', fontSize: 11, marginTop: 4 }}>Jusqu au {new Date(selectedDish.promo_expires_at).toLocaleDateString('fr-FR')}</p>}
                </div>
              ) : (
                <p style={{ color: PRC, fontWeight: 800, fontSize: 26, marginBottom: 16 }}>{selectedDish.price.toLocaleString()} FCFA</p>
              )}
              {selectedDish.description && <p style={{ color: TX2, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{selectedDish.description}</p>}
              <button onClick={() => { addC(selectedDish.id); setSelectedDish(null); }} style={{ width: '100%', padding: 14, borderRadius: 14, background: G, color: '#0A0A0A', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Ajouter a ma commande</button>
            </div>
          </div>
        </div>
      )}

      {/* Cart button */}
      {cCount > 0 && !showCart && (
        <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 40, maxWidth: 500, margin: '0 auto' }}>
          <button onClick={() => setShowCart(true)} style={{ width: '100%', padding: '16px 20px', borderRadius: 16, background: G, color: '#0A0A0A', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', cursor: 'pointer', boxShadow: '0 8px 30px rgba(224,205,87,0.25)', fontFamily: "'Inter',sans-serif", fontSize: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{cCount}</span>
              <span>Voir ma commande</span>
            </div>
            <span style={{ fontWeight: 800 }}>{cTotal.toLocaleString()} F</span>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowCart(false)}>
          <div ref={cartRef} style={{ background: MODAL, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' as any, animation: 'fadeUp 0.3s ease' }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 20, fontWeight: 700 }}>Ma commande</h2>
                <button onClick={() => setShowCart(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: BTNBG, border: 'none', color: TX3, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              {cItems.length === 0 ? (
                <p style={{ textAlign: 'center', color: TX3, padding: '40px 0' }}>Votre commande est vide</p>
              ) : (<>
                <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 12, marginBottom: 20 }}>
                  {cItems.map((item: any) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: `1px solid ${CARDB}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => remC(item.id)} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: 'none', cursor: 'pointer', background: BTNBG, color: BTNC }}>-</button>
                        <span style={{ width: 20, textAlign: 'center' as any, fontWeight: 700, fontSize: 13, color: G }}>{item.qty}</span>
                        <button onClick={() => addC(item.id)} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: 'none', cursor: 'pointer', background: G, color: '#0A0A0A' }}>+</button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 500, fontSize: 14 }}>{item.name}</p>
                        <p style={{ fontSize: 12, color: TX3 }}>{getP(item).toLocaleString()} F x {item.qty}</p>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: G, flexShrink: 0 }}>{item.sub.toLocaleString()} F</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: `2px solid ${dark ? 'rgba(224,205,87,0.2)' : '#E5E7EB'}`, marginBottom: 20 }}>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 22, color: G }}>{cTotal.toLocaleString()} FCFA</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 10 }}>
                  <button onClick={dlPDF} disabled={downloading} style={{ width: '100%', padding: 14, borderRadius: 14, background: G, color: '#0A0A0A', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: downloading ? 0.5 : 1, fontFamily: "'Inter',sans-serif" }}>{downloading ? 'Telechargement...' : 'Telecharger ma commande (PDF)'}</button>
                  <button onClick={clrC} style={{ width: '100%', padding: 12, borderRadius: 14, background: 'transparent', color: TX3, fontWeight: 500, fontSize: 13, border: `1px solid ${CARDB}`, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Vider ma commande</button>
                </div>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: TX3 }}>Menu cree avec <a href="/" style={{ color: G, textDecoration: 'none' }}>Outam</a></div>
    </div>
  );
}
