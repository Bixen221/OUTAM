'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [scansCount, setScansCount] = useState(0);
  const [scansToday, setScansToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddDish, setShowAddDish] = useState(false);
  const [editDish, setEditDish] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [dishForm, setDishForm] = useState({ name:'', price:'', description:'', category_id:'', image:null, promo_price:'', promo_expires_at:'' });
  const [saving, setSaving] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single();
    if (!resto) { router.push('/auth/signup'); return; }
    setRestaurant(resto);
    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', resto.id).order('sort_order');
    setCategories(cats || []);
    const { data: d } = await supabase.from('dishes').select('*').eq('restaurant_id', resto.id).order('sort_order');
    setDishes(d || []);
    const { count: total } = await supabase.from('menu_scans').select('*', { count: 'exact', head: true }).eq('restaurant_id', resto.id);
    setScansCount(total || 0);
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase.from('menu_scans').select('*', { count: 'exact', head: true }).eq('restaurant_id', resto.id).gte('scanned_at', today);
    setScansToday(todayCount || 0);
    setLoading(false);
    generateQR(resto.slug);
  }

  async function generateQR(slug) {
    const QRCode = (await import('qrcode')).default;
    const menuUrl = window.location.origin + '/menu/' + slug;
    const qrData = await QRCode.toDataURL(menuUrl, { width: 400, margin: 1, color: { dark: '#1A1917', light: '#FFFFFF' } });
    const canvas = document.createElement('canvas');
    const W = 560, H = 680;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const clr = restaurant?.theme_color || '#E0CD57';
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(1, '#F8F7F4');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 24); ctx.fill();
    // Border
    ctx.strokeStyle = clr; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(6, 6, W - 12, H - 12, 20); ctx.stroke();
    ctx.strokeStyle = clr + '25'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.roundRect(14, 14, W - 28, H - 28, 16); ctx.stroke();
    // Corner L decorations
    const cL = 30, cO = 20;
    ctx.strokeStyle = clr; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cO, cO + cL); ctx.lineTo(cO, cO); ctx.lineTo(cO + cL, cO); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - cO - cL, cO); ctx.lineTo(W - cO, cO); ctx.lineTo(W - cO, cO + cL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cO, H - cO - cL); ctx.lineTo(cO, H - cO); ctx.lineTo(cO + cL, H - cO); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - cO - cL, H - cO); ctx.lineTo(W - cO, H - cO); ctx.lineTo(W - cO, H - cO - cL); ctx.stroke();
    // Top accent bar
    ctx.fillStyle = clr;
    ctx.beginPath(); ctx.roundRect(W / 2 - 40, 6, 80, 4, 2); ctx.fill();
    // Restaurant name (full or initials if too long)
    ctx.fillStyle = '#1A1917'; ctx.textAlign = 'center';
    const rName = restaurant?.name || 'Restaurant';
    ctx.font = 'bold 28px Arial, sans-serif';
    const nameWidth = ctx.measureText(rName).width;
    if (nameWidth > W - 60) {
      const initials = rName.split(' ').map(w => w[0]).join('').toUpperCase();
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.fillText(initials, W / 2, 58);
    } else {
      ctx.fillText(rName, W / 2, 58);
    }
    // Subtitle
    ctx.fillStyle = '#1A1917'; ctx.font = '500 13px Arial, sans-serif';
    ctx.fillText('SCANNEZ POUR VOIR LE MENU', W / 2, 80);
    // Decorative lines + diamond
    ctx.strokeStyle = clr + '50'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(W / 2 - 72, 94); ctx.lineTo(W / 2 - 8, 94); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 8, 94); ctx.lineTo(W / 2 + 72, 94); ctx.stroke();
    ctx.fillStyle = clr;
    ctx.beginPath(); ctx.moveTo(W / 2, 89); ctx.lineTo(W / 2 + 5, 94); ctx.lineTo(W / 2, 99); ctx.lineTo(W / 2 - 5, 94); ctx.fill();
    ctx.beginPath(); ctx.arc(W / 2 - 76, 94, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W / 2 + 76, 94, 2, 0, Math.PI * 2); ctx.fill();
    // QR shadow + background
    const qS = 370, qX = (W - qS) / 2, qY = 114;
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.beginPath(); ctx.roundRect(qX + 4, qY + 4, qS, qS, 14); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(qX, qY, qS, qS, 14); ctx.fill();
    // Draw QR
    const qrImg = new Image(); qrImg.src = qrData;
    await new Promise(r => { qrImg.onload = r; });
    ctx.drawImage(qrImg, qX + 15, qY + 15, qS - 30, qS - 30);
    // Logo on QR
    const logo = new Image(); logo.src = '/logo.png';
    await new Promise(r => { logo.onload = r; logo.onerror = r; });
    const lS = 90, lX = (W - lS) / 2, lY = qY + (qS - lS) / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(W / 2, lY + lS / 2, lS / 2 + 8, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(logo, lX, lY, lS, lS);
    // Address + phone
    ctx.fillStyle = '#1A1917'; ctx.font = '12px Arial, sans-serif'; ctx.textAlign = 'center';
    if (restaurant?.address) ctx.fillText(restaurant.address, W / 2, qY + qS + 28);
    if (restaurant?.phone) ctx.fillText(restaurant.phone, W / 2, qY + qS + 46);

    // Powered by
    ctx.fillStyle = '#1A1917'; ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText('Propulse par Outam', W / 2, H - 30);
    const url = canvas.toDataURL('image/png');
    setQrUrl(url);
  }

  async function addCategory() {
    if (!newCatName.trim() || !restaurant) return;
    setSaving(true);
    await supabase.from('categories').insert({ restaurant_id: restaurant.id, name: newCatName.trim(), sort_order: categories.length });
    setNewCatName(''); setShowAddCat(false); setSaving(false); loadData(); showToast('Categorie ajoutee');
  }
  async function deleteCategory(id) {
    if (!confirm('Supprimer cette catégorie et tous ses plats ?')) return;
    await supabase.from('categories').delete().eq('id', id); loadData(); showToast('Categorie supprimee');
  }
  async function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
        };
        img.src = e.target.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(file) {
    const ext = file.name.split('.').pop();
    const name = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const { error } = await supabase.storage.from('dish-images').upload(name, file, { contentType: file.type });
    if (error) { console.error(error); return ''; }
    const { data } = supabase.storage.from('dish-images').getPublicUrl(name);
    return data.publicUrl;
  }
  async function saveDish() {
    if (!dishForm.name.trim() || !dishForm.price || !dishForm.category_id) { alert('Remplissez le nom, le prix et la catégorie.'); return; }
    setSaving(true);
    let imageUrl = editDish?.image_url || '';
    if (dishForm.image) { const compressed = await compressImage(dishForm.image); imageUrl = await uploadImage(compressed); }
    const data = {
      name: dishForm.name.trim(), price: parseInt(dishForm.price), description: dishForm.description.trim(),
      category_id: parseInt(dishForm.category_id), restaurant_id: restaurant.id, image_url: imageUrl,
      promo_price: dishForm.promo_price ? parseInt(dishForm.promo_price) : null,
      promo_expires_at: dishForm.promo_expires_at || null,
    };
    if (editDish) { await supabase.from('dishes').update(data).eq('id', editDish.id); }
    else { await supabase.from('dishes').insert({ ...data, sort_order: dishes.length }); }
    setDishForm({ name:'', price:'', description:'', category_id:'', image:null, promo_price:'', promo_expires_at:'' });
    setShowAddDish(false); setEditDish(null); setSaving(false); loadData(); showToast(editDish ? 'Plat modifie' : 'Plat ajoute');
  }
  async function toggleDish(id, available) { await supabase.from('dishes').update({ is_available: !available }).eq('id', id); loadData(); showToast(available ? 'Plat marque epuise' : 'Plat remis disponible'); }
  async function deleteDish(id) { if (!confirm('Supprimer ce plat ?')) return; await supabase.from('dishes').delete().eq('id', id); loadData(); showToast('Plat supprime'); }
  async function removePromo(id) { await supabase.from('dishes').update({ promo_price: null, promo_expires_at: null }).eq('id', id); loadData(); showToast('Promotion retiree'); }

  function openEditDish(dish) {
    setEditDish(dish);
    setDishForm({ name: dish.name, price: dish.price.toString(), description: dish.description||'', category_id: dish.category_id.toString(), image: null, promo_price: dish.promo_price?.toString()||'', promo_expires_at: dish.promo_expires_at ? dish.promo_expires_at.split('T')[0] : '' });
    setShowAddDish(true);
  }
  function openNewDish() {
    setEditDish(null);
    setDishForm({ name:'', price:'', description:'', category_id: categories[0]?.id?.toString()||'', image:null, promo_price:'', promo_expires_at:'' });
    setShowAddDish(true);
  }
  async function logout() { await supabase.auth.signOut(); router.push('/'); }

  function showToast(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) { container = document.createElement('div'); container.id = 'toast-container'; container.className = 'toast-container'; document.body.appendChild(container); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = (type === 'success' ? '✓ ' : type === 'error' ? '✗ ' : 'ℹ ') + msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 h-14" />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 h-20 animate-pulse"><div className="h-6 bg-gray-100 rounded w-16 mx-auto mb-2" /><div className="h-3 bg-gray-100 rounded w-12 mx-auto" /></div>)}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 h-24 animate-pulse"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-xl bg-gray-100" /><div className="flex-1"><div className="h-5 bg-gray-100 rounded w-40 mb-2" /><div className="h-3 bg-gray-100 rounded w-60" /></div></div></div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 h-48 animate-pulse" />
        {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 h-20 animate-pulse" />)}
      </div>
    </div>
  );
  const menuUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/menu/' + restaurant?.slug;
  function isPromoActive(dish) { return dish.promo_price && (!dish.promo_expires_at || new Date(dish.promo_expires_at) > new Date()); }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/icon.png" alt="Outam" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-1">
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-900 shadow-sm">Menu</span>
              <Link href="/dashboard/analytics" className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-900">Analytics</Link>
              <Link href="/dashboard/settings" className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-900">Profil</Link>
            </div>
            <Link href={'/menu/' + restaurant?.slug} target="_blank" className="btn-ghost text-xs hidden sm:inline-flex">Mon menu</Link>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500">Sortir</button>
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><div className="text-2xl font-bold text-brand-500">{dishes.length}</div><div className="text-xs text-gray-400 mt-0.5">Plats</div></div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><div className="text-2xl font-bold text-brand-500">{categories.length}</div><div className="text-xs text-gray-400 mt-0.5">Catégories</div></div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><div className="text-2xl font-bold text-green-500">{scansCount}</div><div className="text-xs text-gray-400 mt-0.5">Scans total</div></div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><div className="text-2xl font-bold text-amber-500">{scansToday}</div><div className="text-xs text-gray-400 mt-0.5">Aujourd&apos;hui</div></div>
        </div>
        {/* Onboarding guide */}
        {(categories.length === 0 || dishes.length === 0 || !restaurant?.logo_url) && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200">
            <h2 className="font-bold text-base mb-1">Bienvenue sur Outam !</h2>
            <p className="text-sm text-gray-500 mb-4">Suivez ces etapes pour configurer votre menu digital.</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (restaurant?.logo_url ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400')}>{restaurant?.logo_url ? '✓' : '1'}</div>
                <span className={'text-sm ' + (restaurant?.logo_url ? 'line-through text-gray-400' : 'text-gray-700 font-medium')}>Ajoutez votre logo et informations</span>
                {!restaurant?.logo_url && <Link href="/dashboard/settings" className="text-xs text-amber-600 font-medium hover:underline ml-auto">Configurer</Link>}
              </div>
              <div className="flex items-center gap-3">
                <div className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (categories.length > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400')}>{categories.length > 0 ? '✓' : '2'}</div>
                <span className={'text-sm ' + (categories.length > 0 ? 'line-through text-gray-400' : 'text-gray-700 font-medium')}>Creez vos categories (Entrees, Plats, Boissons...)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (dishes.length > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400')}>{dishes.length > 0 ? '✓' : '3'}</div>
                <span className={'text-sm ' + (dishes.length > 0 ? 'line-through text-gray-400' : 'text-gray-700 font-medium')}>Ajoutez vos plats avec photos et prix</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (scansCount > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400')}>{scansCount > 0 ? '✓' : '4'}</div>
                <span className={'text-sm ' + (scansCount > 0 ? 'line-through text-gray-400' : 'text-gray-700 font-medium')}>Partagez votre QR code et recevez vos premiers clients</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-4">
            {restaurant?.logo_url ? <img src={restaurant.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" /> : <div className="w-14 h-14 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 text-xl font-bold">{restaurant?.name?.[0]}</div>}
            <div className="flex-1"><h1 className="font-display text-xl font-bold">{restaurant?.name}</h1><p className="text-gray-400 text-sm">{restaurant?.address || 'Adresse non renseignée'}{restaurant?.phone ? ' · ' + restaurant.phone : ''}</p></div>
            <Link href="/dashboard/settings" className="text-xs text-brand-500 hover:underline">Modifier</Link>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h2 className="font-bold text-base mb-3">Partagez votre menu</h2>
          <div className="flex flex-col md:flex-row items-center gap-5">
            {qrUrl && <div className="text-center"><img src={qrUrl} alt="QR" className="w-36 h-36 rounded-xl border" /><a href={qrUrl} download={'qr-' + restaurant?.slug + '.png'} className="text-xs text-brand-500 font-medium mt-2 block hover:underline">Télécharger</a></div>}
            <div className="flex-1 w-full"><p className="text-sm text-gray-500 mb-2">Lien du menu :</p><div className="flex gap-2"><input type="text" value={menuUrl} readOnly className="input-field text-sm flex-1" /><button onClick={() => { navigator.clipboard.writeText(menuUrl); alert('Copié !'); }} className="btn-primary text-sm px-4">Copier</button></div></div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-base">Catégories</h2><button onClick={() => setShowAddCat(true)} className="btn-primary text-xs">+ Catégorie</button></div>
          {showAddCat && <div className="bg-white rounded-2xl p-4 border border-brand-200 mb-3 flex gap-2"><input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="ex: Entrées, Plats, Boissons..." className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && addCategory()} autoFocus /><button onClick={addCategory} disabled={saving} className="btn-primary text-xs">{saving ? '...' : 'OK'}</button><button onClick={() => setShowAddCat(false)} className="btn-ghost text-xs">Annuler</button></div>}
          {categories.length === 0 ? <p className="text-center text-gray-400 py-6 text-sm">Aucune catégorie.</p> : <div className="flex flex-wrap gap-2">{categories.map((cat) => <div key={cat.id} className="bg-white rounded-full px-3 py-1.5 border border-gray-200 flex items-center gap-2 text-sm"><span className="font-medium">{cat.name}</span><span className="text-gray-400 text-xs">({dishes.filter(d => d.category_id === cat.id).length})</span><button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-600 text-xs">×</button></div>)}</div>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-base">Plats</h2>{categories.length > 0 && <button onClick={openNewDish} className="btn-primary text-xs">+ Plat</button>}</div>
          {showAddDish && <div className="bg-white rounded-2xl p-5 border border-brand-200 mb-4"><h3 className="font-bold text-sm mb-4">{editDish ? 'Modifier le plat' : 'Nouveau plat'}</h3><div className="grid md:grid-cols-2 gap-3"><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Nom *</label><input type="text" value={dishForm.name} onChange={(e) => setDishForm({...dishForm, name: e.target.value})} placeholder="ex: Thiéboudienne" className="input-field" /></div><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Prix (FCFA) *</label><input type="number" value={dishForm.price} onChange={(e) => setDishForm({...dishForm, price: e.target.value})} placeholder="3500" className="input-field" /></div><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Catégorie *</label><select value={dishForm.category_id} onChange={(e) => setDishForm({...dishForm, category_id: e.target.value})} className="input-field">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Photo</label><input type="file" accept="image/*" onChange={(e) => setDishForm({...dishForm, image: e.target.files?.[0]||null})} className="input-field text-sm" /></div><div className="md:col-span-2"><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Description</label><textarea value={dishForm.description} onChange={(e) => setDishForm({...dishForm, description: e.target.value})} placeholder="Décrivez le plat..." className="input-field" rows={2} /></div></div><div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200"><h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-3">Promotion (facultatif)</h4><div className="grid md:grid-cols-2 gap-3"><div><label className="text-xs text-gray-500 block mb-1">Prix promo (FCFA)</label><input type="number" value={dishForm.promo_price} onChange={(e) => setDishForm({...dishForm, promo_price: e.target.value})} placeholder="ex: 2500" className="input-field" /></div><div><label className="text-xs text-gray-500 block mb-1">Expire le</label><input type="date" value={dishForm.promo_expires_at} onChange={(e) => setDishForm({...dishForm, promo_expires_at: e.target.value})} className="input-field" /></div></div></div><div className="flex gap-2 mt-4"><button onClick={saveDish} disabled={saving} className="btn-primary text-sm">{saving ? 'Enregistrement...' : editDish ? 'Modifier' : 'Ajouter'}</button><button onClick={() => { setShowAddDish(false); setEditDish(null); }} className="btn-ghost text-sm">Annuler</button></div></div>}
          {dishes.length === 0 ? <p className="text-center text-gray-400 py-6 text-sm">Aucun plat.</p> : <div className="space-y-4">{categories.map((cat) => { const cd = dishes.filter(d => d.category_id === cat.id); if (!cd.length) return null; return <div key={cat.id}><h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat.name}</h3><div className="space-y-2">{cd.map((dish) => { const pa = isPromoActive(dish); return <div key={dish.id} className={'bg-white rounded-2xl p-4 border flex items-center gap-3 transition-colors ' + (!dish.is_available ? 'border-red-200 bg-red-50/30' : 'border-gray-100 hover:border-brand-200')}>{dish.image_url ? <img src={dish.image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">🍽️</div>}<div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className={'font-semibold text-sm ' + (!dish.is_available ? 'line-through text-gray-400' : '')}>{dish.name}</span>{!dish.is_available && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-500 font-semibold">ÉPUISÉ</span>}{pa && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold">PROMO</span>}</div>{dish.description && <p className="text-xs text-gray-400 truncate mt-0.5">{dish.description}</p>}{pa && dish.promo_expires_at && <p className="text-[10px] text-amber-500 mt-0.5">Expire le {new Date(dish.promo_expires_at).toLocaleDateString('fr-FR')}</p>}</div><div className="text-right flex-shrink-0"><div className="flex items-center gap-1.5">{pa ? <><span className="text-xs text-gray-400 line-through">{dish.price.toLocaleString()} F</span><span className="font-bold text-amber-500 text-sm">{dish.promo_price.toLocaleString()} F</span></> : <span className="font-bold text-brand-500 text-sm">{dish.price.toLocaleString()} F</span>}</div><div className="flex items-center gap-1 mt-1.5 justify-end flex-wrap"><button onClick={() => toggleDish(dish.id, dish.is_available)} className={'text-[10px] px-2 py-1 rounded-full font-medium ' + (dish.is_available ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>{dish.is_available ? '✓ Dispo' : '✗ Épuisé'}</button>{pa && <button onClick={() => removePromo(dish.id)} className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-600">Retirer promo</button>}<button onClick={() => openEditDish(dish)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-500">Modifier</button><button onClick={() => deleteDish(dish.id)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">×</button></div></div></div>; })}</div></div>; })}</div>}
        </div>
      </div>
    </div>
  );
}
