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
  const [editCatId, setEditCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [dishForm, setDishForm] = useState({ name:'', price:'', description:'', category_id:'', image:null, promo_price:'', promo_expires_at:'' });
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState(null);
  const [searchDish, setSearchDish] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [catalogPrices, setCatalogPrices] = useState({});
  const [importing, setImporting] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [dailySpecials, setDailySpecials] = useState([]);
  const [showAddSpecial, setShowAddSpecial] = useState(false);
  const [specialForm, setSpecialForm] = useState({ name: '', description: '', price: '', image: null });
  const [editSpecial, setEditSpecial] = useState(null);
  const [trashedCats, setTrashedCats] = useState([]);
  const [trashedDishes, setTrashedDishes] = useState([]);
  const [catalogData, setCatalogData] = useState([]);
  const [qrUrl, setQrUrl] = useState('');
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single();
    if (!resto) { router.push('/auth/signup'); return; }
    setRestaurant(resto);
    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', resto.id).is('deleted_at', null).order('sort_order');
    setCategories(cats || []);
    const { data: d } = await supabase.from('dishes').select('*').eq('restaurant_id', resto.id).is('deleted_at', null).order('sort_order');
    setDishes(d || []);
    const { data: tCats } = await supabase.from('categories').select('*').eq('restaurant_id', resto.id).not('deleted_at', 'is', null);
    setTrashedCats(tCats || []);
    const { data: tDishes } = await supabase.from('dishes').select('*').eq('restaurant_id', resto.id).not('deleted_at', 'is', null);
    setTrashedDishes(tDishes || []);
    const today = new Date().toISOString().split('T')[0];
    const { data: specials } = await supabase.from('daily_specials').select('*').eq('restaurant_id', resto.id).gte('valid_date', today).order('created_at', { ascending: false });
    setDailySpecials(specials || []);
    const { count: total } = await supabase.from('menu_scans').select('*', { count: 'exact', head: true }).eq('restaurant_id', resto.id);
    setScansCount(total || 0);
    const { count: todayCount } = await supabase.from('menu_scans').select('*', { count: 'exact', head: true }).eq('restaurant_id', resto.id).gte('scanned_at', today);
    setScansToday(todayCount || 0);
    setLoading(false);
    generateQR(resto);
  }

  async function generateQR(resto) {
    const QRCode = (await import('qrcode')).default;
    const menuUrl = window.location.origin + '/menu/' + resto.slug;
    const qrData = await QRCode.toDataURL(menuUrl, { width: 400, margin: 1, color: { dark: '#1A1917', light: '#FFFFFF' } });
    const canvas = document.createElement('canvas');
    const W = 560, H = 680;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const clr = resto?.theme_color || '#E0CD57';
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
    const rName = resto?.name || 'Restaurant';
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
    if (resto?.address) ctx.fillText(resto.address, W / 2, qY + qS + 28);
    if (resto?.phone) ctx.fillText(resto.phone, W / 2, qY + qS + 46);

    // Powered by
    ctx.fillStyle = '#1A1917'; ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText('Propulse par Outam', W / 2, H - 30);
    const url = canvas.toDataURL('image/png');
    setQrUrl(url);
  }

  async function addCategory() {
    if (!newCatName.trim() || !restaurant) return;
    if (!isPremium && categories.length >= maxCategories) { showToast('Limite de ' + maxCategories + ' categories atteinte. Passez au Premium !', 'error'); return; }
    setSaving(true);
    await supabase.from('categories').insert({ restaurant_id: restaurant.id, name: newCatName.trim(), sort_order: categories.length });
    setNewCatName(''); setShowAddCat(false); setSaving(false); loadData(); showToast('Categorie ajoutee');
  }
  async function renameCategory() {
    if (!editCatName.trim() || !editCatId) return;
    setSaving(true);
    await supabase.from('categories').update({ name: editCatName.trim() }).eq('id', editCatId);
    setEditCatId(null); setEditCatName(''); setSaving(false); loadData(); showToast('Categorie renommee');
  }

  async function deleteCategory(id) {
    if (!confirm('Supprimer cette catégorie et tous ses plats ?')) return;
    const now = new Date().toISOString(); await supabase.from('dishes').update({ deleted_at: now }).eq('category_id', id).is('deleted_at', null); await supabase.from('categories').update({ deleted_at: now }).eq('id', id); loadData(); showToast('Categorie mise a la corbeille');
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
    if (!editDish && !isPremium && dishes.length >= maxDishes) { showToast('Limite de ' + maxDishes + ' plats atteinte. Passez au Premium !', 'error'); return; }
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
  async function deleteDish(id) { if (!confirm('Supprimer ce plat ?')) return; await supabase.from('dishes').update({ deleted_at: new Date().toISOString() }).eq('id', id); loadData(); showToast('Plat mis a la corbeille'); }
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
  async function saveSpecial() {
    if (!editSpecial && !isPremium && dailySpecials.length >= maxSpecials) { showToast('Limite de ' + maxSpecials + ' plats du jour atteinte. Passez au Premium !', 'error'); return; }
    if (!specialForm.name.trim() || !specialForm.price) { showToast('Remplissez le nom et le prix', 'error'); return; }
    if (parseInt(specialForm.price) < 0) { showToast('Le prix ne peut pas etre negatif', 'error'); return; }
    setSaving(true);
    let imageUrl = editSpecial?.image_url || '';
    if (specialForm.image) { const compressed = await compressImage(specialForm.image); imageUrl = await uploadImage(compressed); }
    const data = { restaurant_id: restaurant.id, name: specialForm.name.trim(), description: specialForm.description.trim(), price: parseInt(specialForm.price), image_url: imageUrl, valid_date: new Date().toISOString().split('T')[0] };
    if (editSpecial) { await supabase.from('daily_specials').update(data).eq('id', editSpecial.id); }
    else { await supabase.from('daily_specials').insert(data); }
    setSpecialForm({ name: '', description: '', price: '', image: null }); setShowAddSpecial(false); setEditSpecial(null); setSaving(false); loadData(); showToast(editSpecial ? 'Plat du jour modifie' : 'Plat du jour ajoute');
  }

  async function deleteSpecial(id) {
    await supabase.from('daily_specials').delete().eq('id', id);
    loadData(); showToast('Plat du jour supprime');
  }

  async function loadCatalog() {
    const { data: cats } = await supabase.from('catalog_categories').select('*').is('deleted_at', null).order('sort_order');
    const { data: dsh } = await supabase.from('catalog_dishes').select('*').is('deleted_at', null).order('sort_order');
    const catalog = (cats || []).map(c => ({
      category: c.name, emoji: c.emoji,
      dishes: (dsh || []).filter(d => d.category_id === c.id).map(d => ({ name: d.name, desc: d.description }))
    }));
    setCatalogData(catalog);
  }

  function toggleCatalogItem(catName, dishName) {
    const key = catName + '::' + dishName;
    setSelectedItems(prev => {
      const n = { ...prev };
      if (n[key]) delete n[key];
      else n[key] = true;
      return n;
    });
  }

  function setCatalogPrice(catName, dishName, price) {
    const key = catName + '::' + dishName;
    setCatalogPrices(prev => ({ ...prev, [key]: price }));
  }

  function selectAllInCategory(catName, dishes) {
    const updates = {};
    dishes.forEach(d => { updates[catName + '::' + d.name] = true; });
    setSelectedItems(prev => ({ ...prev, ...updates }));
  }

  function deselectAllInCategory(catName, dishes) {
    setSelectedItems(prev => {
      const n = { ...prev };
      dishes.forEach(d => { delete n[catName + '::' + d.name]; });
      return n;
    });
  }

  async function importFromCatalog() {
    if (!restaurant) return;
    const selected = Object.keys(selectedItems);
    if (selected.length === 0) { showToast('Selectionnez au moins un plat', 'error'); return; }
    setImporting(true);
    const catMap = {};
    for (const key of selected) {
      const [catName] = key.split('::');
      if (!catMap[catName]) {
        const existing = categories.find(c => c.name === catName);
        if (existing) { catMap[catName] = existing.id; }
        else {
          const catInfo = catalogData.find(c => c.category === catName);
          const { data } = await supabase.from('categories').insert({ restaurant_id: restaurant.id, name: catName, sort_order: categories.length + Object.keys(catMap).length }).select().single();
          if (data) catMap[catName] = data.id;
        }
      }
    }
    let count = 0;
    for (const key of selected) {
      const [catName, dishName] = key.split('::');
      const catId = catMap[catName];
      if (!catId) continue;
      const catInfo = catalogData.find(c => c.category === catName);
      const dishInfo = catInfo?.dishes.find(d => d.name === dishName);
      if (!dishInfo) continue;
      const price = Math.max(0, parseInt(catalogPrices[key]) || 0);
      const existing = dishes.find(d => d.name === dishName && d.category_id === catId);
      if (existing) continue;
      await supabase.from('dishes').insert({
        restaurant_id: restaurant.id, category_id: catId, name: dishInfo.name,
        description: dishInfo.desc, price: price, sort_order: dishes.length + count,
      });
      count++;
    }
    setShowCatalog(false);
    setSelectedItems({});
    setCatalogPrices({});
    setImporting(false);
    loadData();
    showToast(count + ' plat' + (count > 1 ? 's' : '') + ' importe' + (count > 1 ? 's' : ''));
  }

  async function restoreCategory(id) {
    await supabase.from('categories').update({ deleted_at: null }).eq('id', id);
    await supabase.from('dishes').update({ deleted_at: null }).eq('category_id', id);
    loadData(); showToast('Categorie restauree');
  }

  async function restoreDish(id) {
    await supabase.from('dishes').update({ deleted_at: null }).eq('id', id);
    loadData(); showToast('Plat restaure');
  }

  async function permanentDeleteCategory(id) {
    if (!confirm('Supprimer definitivement cette categorie et ses plats ?')) return;
    await supabase.from('dishes').delete().eq('category_id', id);
    await supabase.from('categories').delete().eq('id', id);
    loadData(); showToast('Categorie supprimee definitivement');
  }

  async function permanentDeleteDish(id) {
    if (!confirm('Supprimer definitivement ce plat ?')) return;
    await supabase.from('dishes').delete().eq('id', id);
    loadData(); showToast('Plat supprime definitivement');
  }

  async function emptyTrash() {
    if (!confirm('Vider la corbeille ? Cette action est irreversible.')) return;
    for (const c of trashedCats) { await supabase.from('dishes').delete().eq('category_id', c.id); await supabase.from('categories').delete().eq('id', c.id); }
    for (const d of trashedDishes) { await supabase.from('dishes').delete().eq('id', d.id); }
    loadData(); showToast('Corbeille videe');
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
  const isPremium = restaurant?.plan === 'premium' && restaurant?.premium_expires_at && new Date(restaurant.premium_expires_at) > new Date();
  const maxDishes = isPremium ? 99999 : 10;
  const maxCategories = isPremium ? 99999 : 3;
  const maxSpecials = isPremium ? 99999 : 2;

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
        {/* Premium banner */}
        {!isPremium && (
          <div style={{ background: 'linear-gradient(135deg, #0A0A0A, #1A1917)', borderRadius: 16, padding: 20, border: '1px solid rgba(224,205,87,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>👑</span>
                <h3 style={{ color: '#E0CD57', fontWeight: 700, fontSize: 15 }}>Passez au Premium</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.5 }}>Plats et categories illimites, plats du jour illimites, numero de table, sans branding Outam.</p>
              <p style={{ color: '#E0CD57', fontWeight: 700, fontSize: 14, marginTop: 4 }}>8 500 FCFA / an</p>
            </div>
            <a href={'https://wa.me/221766196090?text=' + encodeURIComponent('Bonjour, je souhaite souscrire au plan Premium Outam pour mon restaurant ' + (restaurant?.name || '') + '. Slug: ' + (restaurant?.slug || ''))} target="_blank" style={{ padding: '10px 20px', borderRadius: 12, background: '#E0CD57', color: '#0A0A0A', fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Souscrire</a>
          </div>
        )}

        {/* Limits info */}
        {!isPremium && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: categories.length >= maxCategories ? '#FEF2F2' : '#F0FDF4', border: '1px solid ' + (categories.length >= maxCategories ? '#FECACA' : '#BBF7D0'), fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{categories.length}/{maxCategories}</span> <span style={{ color: '#6B7280' }}>categories</span>
            </div>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: dishes.length >= maxDishes ? '#FEF2F2' : '#F0FDF4', border: '1px solid ' + (dishes.length >= maxDishes ? '#FECACA' : '#BBF7D0'), fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{dishes.length}/{maxDishes}</span> <span style={{ color: '#6B7280' }}>plats</span>
            </div>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: dailySpecials.length >= maxSpecials ? '#FEF2F2' : '#F0FDF4', border: '1px solid ' + (dailySpecials.length >= maxSpecials ? '#FECACA' : '#BBF7D0'), fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{dailySpecials.length}/{maxSpecials}</span> <span style={{ color: '#6B7280' }}>plats du jour</span>
            </div>
          </div>
        )}

        {/* Menu du jour */}
        <div style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', borderRadius: 16, padding: 20, border: '1px solid #FCD34D' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔥</span>
              <h2 style={{ fontWeight: 700, fontSize: 16 }}>Menu du jour</h2>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#FEF3C7', color: '#92400E', fontWeight: 600, border: '1px solid #FCD34D' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <button onClick={() => setShowAddSpecial(true)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, background: '#D97706', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Plat du jour</button>
          </div>

          {dailySpecials.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#92400E80', fontSize: 13, padding: '12px 0' }}>Aucun plat du jour. Appuyez sur + pour selectionner vos specials !</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dailySpecials.map(sp => (
                <div key={sp.id} style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {sp.image_url ? <img src={sp.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 48, height: 48, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔥</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{sp.name}</p>
                    {sp.description && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{sp.description}</p>}
                  </div>
                  <span style={{ fontWeight: 700, color: '#D97706', fontSize: 14, flexShrink: 0 }}>{sp.price.toLocaleString()} F</span>
                  <button onClick={() => deleteSpecial(sp.id)} style={{ width: 24, height: 24, borderRadius: '50%', background: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>x</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Picker Modal - choisir plats du jour */}
        {showAddSpecial && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowAddSpecial(false)}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontWeight: 700, fontSize: 18 }}>Choisir les plats du jour</h2>
                    <p style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>Tapez sur les plats a mettre en special</p>
                  </div>
                  <button onClick={() => setShowAddSpecial(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6B7280' }}>x</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
                {/* Existing dishes by category */}
                {categories.map(cat => {
                  const catDishes = dishes.filter(d => d.category_id === cat.id);
                  if (!catDishes.length) return null;
                  return (
                    <div key={cat.id} style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{cat.name}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {catDishes.map(dish => {
                          const alreadySpecial = dailySpecials.some(s => s.name === dish.name);
                          return (
                            <div key={dish.id} onClick={() => { if (!alreadySpecial) { if (!isPremium && dailySpecials.length >= maxSpecials) { showToast('Limite de ' + maxSpecials + ' plats du jour. Passez au Premium !', 'error'); return; } supabase.from('daily_specials').insert({ restaurant_id: restaurant.id, name: dish.name, description: dish.description || '', price: dish.price, image_url: dish.image_url || '', valid_date: new Date().toISOString().split('T')[0] }).then(() => { loadData(); showToast(dish.name + ' ajoute au menu du jour'); }); } }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: alreadySpecial ? 'default' : 'pointer', background: alreadySpecial ? '#F0FDF4' : '#FAFAFA', border: alreadySpecial ? '1px solid #BBF7D0' : '1px solid #F3F4F6', transition: 'all 0.15s', opacity: alreadySpecial ? 0.7 : 1 }}>
                              {dish.image_url ? <img src={dish.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🍽️</div>}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 500, fontSize: 13 }}>{dish.name}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF' }}>{dish.price.toLocaleString()} F</p>
                              </div>
                              {alreadySpecial ? (
                                <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>✓ Ajoute</span>
                              ) : (
                                <span style={{ fontSize: 18, color: '#D97706', fontWeight: 700 }}>+</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Add new special */}
                <div style={{ marginTop: 8, borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>Ou creer un plat special (pas dans le menu)</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={specialForm.name} onChange={e => setSpecialForm({...specialForm, name: e.target.value})} placeholder="Nom du plat" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none' }} />
                    <input type="number" min="0" value={specialForm.price} onChange={e => setSpecialForm({...specialForm, price: e.target.value})} placeholder="Prix" style={{ width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', textAlign: 'right' }} />
                    <button onClick={() => { if (specialForm.name.trim() && specialForm.price) { supabase.from('daily_specials').insert({ restaurant_id: restaurant.id, name: specialForm.name.trim(), description: specialForm.description, price: Math.max(0, parseInt(specialForm.price)), image_url: '', valid_date: new Date().toISOString().split('T')[0] }).then(() => { setSpecialForm({name:'', description:'', price:'', image: null}); loadData(); showToast('Plat special ajoute'); }); } else { showToast('Remplissez le nom et le prix', 'error'); }}} style={{ padding: '8px 16px', borderRadius: 8, background: '#D97706', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Ajouter</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

                  <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-base">Catégories</h2><button onClick={() => setShowAddCat(true)} className="btn-primary text-xs">+ Catégorie</button></div>
          {showAddCat && <div className="bg-white rounded-2xl p-4 border border-brand-200 mb-3 flex gap-2"><input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="ex: Entrées, Plats, Boissons..." className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && addCategory()} autoFocus /><button onClick={addCategory} disabled={saving} className="btn-primary text-xs">{saving ? '...' : 'OK'}</button><button onClick={() => setShowAddCat(false)} className="btn-ghost text-xs">Annuler</button></div>}
          {categories.length === 0 ? <p className="text-center text-gray-400 py-6 text-sm">Aucune catégorie.</p> : <div className="flex flex-wrap gap-2">{categories.map((cat) => <div key={cat.id} className="bg-white rounded-full px-3 py-1.5 border border-gray-200 flex items-center gap-2 text-sm"><span className="font-medium">{cat.name}</span><span className="text-gray-400 text-xs">({dishes.filter(d => d.category_id === cat.id).length})</span><button onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); }} className="text-gray-400 hover:text-brand-500 text-xs">✎</button><button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-600 text-xs">×</button></div>)}</div>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-base">Plats <span className="text-gray-400 font-normal text-sm">({dishes.length})</span></h2><div className="flex gap-2 items-center">{(trashedCats.length + trashedDishes.length) > 0 && <button onClick={() => setShowTrash(!showTrash)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: showTrash ? '#FEE2E2' : '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, position: 'relative', transition: 'all 0.2s' }} title="Corbeille">🗑️<span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{trashedCats.length + trashedDishes.length}</span></button>}{categories.length > 0 && <button onClick={() => { loadCatalog(); setShowCatalog(true); }} className="btn-ghost text-xs">Importer</button>}{categories.length > 0 && <button onClick={openNewDish} className="btn-primary text-xs">+ Plat</button>}</div></div>
          {/* Search and category filters */}
          {dishes.length > 0 && (
            <div className="mb-4 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 bg-white rounded-xl border border-gray-200 flex items-center px-3">
                  <span className="text-gray-300 text-sm mr-2">🔍</span>
                  <input type="text" value={searchDish} onChange={(e) => setSearchDish(e.target.value)} placeholder="Rechercher un plat..." className="flex-1 py-2 text-sm outline-none bg-transparent" />
                  {searchDish && <button onClick={() => setSearchDish('')} className="text-gray-300 text-sm hover:text-gray-500">✕</button>}
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => setFilterCat(null)} className={'px-3 py-1.5 rounded-full text-xs font-medium transition-all ' + (!filterCat ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>Tout ({dishes.length})</button>
                {categories.map(cat => {
                  const count = dishes.filter(d => d.category_id === cat.id).length;
                  return <button key={cat.id} onClick={() => setFilterCat(cat.id)} className={'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ' + (filterCat === cat.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>{cat.name} ({count})</button>;
                })}
              </div>
            </div>
          )}

          {showAddDish && <div className="bg-white rounded-2xl p-5 border border-brand-200 mb-4"><h3 className="font-bold text-sm mb-4">{editDish ? 'Modifier le plat' : 'Nouveau plat'}</h3><div className="grid md:grid-cols-2 gap-3"><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Nom *</label><input type="text" value={dishForm.name} onChange={(e) => setDishForm({...dishForm, name: e.target.value})} placeholder="ex: Thiéboudienne" className="input-field" /></div><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Prix (FCFA) *</label><input type="number" value={dishForm.price} onChange={(e) => setDishForm({...dishForm, price: e.target.value})} placeholder="3500" className="input-field" /></div><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Catégorie *</label><select value={dishForm.category_id} onChange={(e) => setDishForm({...dishForm, category_id: e.target.value})} className="input-field">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Photo</label><input type="file" accept="image/*" onChange={(e) => setDishForm({...dishForm, image: e.target.files?.[0]||null})} className="input-field text-sm" /></div><div className="md:col-span-2"><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Description</label><textarea value={dishForm.description} onChange={(e) => setDishForm({...dishForm, description: e.target.value})} placeholder="Décrivez le plat..." className="input-field" rows={2} /></div></div><div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200"><h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-3">Promotion (facultatif)</h4><div className="grid md:grid-cols-2 gap-3"><div><label className="text-xs text-gray-500 block mb-1">Prix promo (FCFA)</label><input type="number" value={dishForm.promo_price} onChange={(e) => setDishForm({...dishForm, promo_price: e.target.value})} placeholder="ex: 2500" className="input-field" /></div><div><label className="text-xs text-gray-500 block mb-1">Expire le</label><input type="date" value={dishForm.promo_expires_at} onChange={(e) => setDishForm({...dishForm, promo_expires_at: e.target.value})} className="input-field" /></div></div></div><div className="flex gap-2 mt-4"><button onClick={saveDish} disabled={saving} className="btn-primary text-sm">{saving ? 'Enregistrement...' : editDish ? 'Modifier' : 'Ajouter'}</button><button onClick={() => { setShowAddDish(false); setEditDish(null); }} className="btn-ghost text-sm">Annuler</button></div></div>}
          {dishes.length === 0 ? <p className="text-center text-gray-400 py-6 text-sm">Aucun plat.</p> : (() => {
            const filteredDishes = dishes.filter(d => {
              if (filterCat && d.category_id !== filterCat) return false;
              if (searchDish && !d.name.toLowerCase().includes(searchDish.toLowerCase())) return false;
              return true;
            });
            if (filteredDishes.length === 0) return <p className="text-center text-gray-400 py-6 text-sm">Aucun plat trouve.</p>;
            return <div className="space-y-3">{categories.map((cat) => { const cd = filteredDishes.filter(d => d.category_id === cat.id); if (!cd.length) return null; return <div key={cat.id}><h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat.name}</h3><div className="space-y-2">{cd.map((dish) => { const pa = isPromoActive(dish); return <div key={dish.id} className={'bg-white rounded-xl p-3 border flex items-center gap-3 transition-colors ' + (!dish.is_available ? 'border-red-200 bg-red-50/30' : 'border-gray-100 hover:border-brand-200')}>{dish.image_url ? <img src={dish.image_url} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" /> : <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center text-base flex-shrink-0">🍽️</div>}<div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className={'font-semibold text-sm ' + (!dish.is_available ? 'line-through text-gray-400' : '')}>{dish.name}</span>{!dish.is_available && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-500 font-semibold">ÉPUISÉ</span>}{pa && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold">PROMO</span>}</div>{dish.description && <p className="text-xs text-gray-400 truncate mt-0.5">{dish.description}</p>}{pa && dish.promo_expires_at && <p className="text-[10px] text-amber-500 mt-0.5">Expire le {new Date(dish.promo_expires_at).toLocaleDateString('fr-FR')}</p>}</div><div className="text-right flex-shrink-0"><div className="flex items-center gap-1.5">{pa ? <><span className="text-xs text-gray-400 line-through">{dish.price.toLocaleString()} F</span><span className="font-bold text-amber-500 text-sm">{dish.promo_price.toLocaleString()} F</span></> : <span className="font-bold text-brand-500 text-sm">{dish.price.toLocaleString()} F</span>}</div><div className="flex items-center gap-1 mt-1.5 justify-end flex-wrap"><button onClick={() => toggleDish(dish.id, dish.is_available)} className={'text-[10px] px-2 py-1 rounded-full font-medium ' + (dish.is_available ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>{dish.is_available ? '✓ Dispo' : '✗ Épuisé'}</button>{pa && <button onClick={() => removePromo(dish.id)} className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-600">Retirer promo</button>}<button onClick={() => openEditDish(dish)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-500">Modifier</button><button onClick={() => deleteDish(dish.id)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">×</button></div></div></div>; })}</div></div>; })}</div>;
            })()}
        </div>
      </div>

      {/* Trash Modal */}
      {showTrash && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowTrash(false)}>
        <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 550, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 18 }}>Corbeille</h2>
              <p style={{ color: '#9CA3AF', fontSize: 13 }}>{trashedCats.length + trashedDishes.length} element(s)</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {(trashedCats.length + trashedDishes.length) > 0 && <button onClick={emptyTrash} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}>Vider tout</button>}
              <button onClick={() => setShowTrash(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6B7280' }}>x</button>
            </div>
          </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {trashedCats.length === 0 && trashedDishes.length === 0 ? (
            <p className="text-center text-gray-400 py-12">La corbeille est vide</p>
          ) : (
            <div className="space-y-2">
              {trashedCats.map(cat => (
                <div key={'tc-' + cat.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">📁</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{cat.name}</p>
                    <p className="text-xs text-gray-400">Categorie — supprimee le {new Date(cat.deleted_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => restoreCategory(cat.id)} className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600">Restaurer</button>
                    <button onClick={() => permanentDeleteCategory(cat.id)} className="text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-400">Supprimer</button>
                  </div>
                </div>
              ))}
              {trashedDishes.map(dish => {
                const cat = [...categories, ...trashedCats].find(c => c.id === dish.category_id);
                return (
                  <div key={'td-' + dish.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 opacity-60">
                    {dish.image_url ? <img src={dish.image_url} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">🍽️</div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{dish.name}</p>
                      <p className="text-xs text-gray-400">{cat?.name || 'Sans categorie'} — {dish.price?.toLocaleString()} F — supprime le {new Date(dish.deleted_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => restoreDish(dish.id)} className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600">Restaurer</button>
                      <button onClick={() => permanentDeleteDish(dish.id)} className="text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-400">Supprimer</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
        </div>
      )}

      {/* Catalog Modal */}
      {showCatalog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowCatalog(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: 18 }}>Catalogue de plats</h2>
                <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 2 }}>Selectionnez les plats que vous proposez et fixez vos prix</p>
              </div>
              <button onClick={() => setShowCatalog(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6B7280' }}>x</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {catalogData.map(cat => {
                const allSelected = cat.dishes.every(d => selectedItems[cat.category + '::' + d.name]);
                const someSelected = cat.dishes.some(d => selectedItems[cat.category + '::' + d.name]);
                return (
                  <div key={cat.category} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.category}</span>
                      </div>
                      <button onClick={() => allSelected ? deselectAllInCategory(cat.category, cat.dishes) : selectAllInCategory(cat.category, cat.dishes)} style={{ fontSize: 12, color: '#3300FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>{allSelected ? 'Tout deselectionner' : 'Tout selectionner'}</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {cat.dishes.map(dish => {
                        const key = cat.category + '::' + dish.name;
                        const sel = selectedItems[key];
                        return (
                          <div key={dish.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: sel ? '#EEF2FF' : '#FAFAFA', border: sel ? '1px solid #C7D2FE' : '1px solid #F3F4F6', transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => toggleCatalogItem(cat.category, dish.name)}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, border: sel ? 'none' : '2px solid #D1D5DB', background: sel ? '#3300FF' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                              {sel && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>&#10003;</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 500, fontSize: 14 }}>{dish.name}</p>
                              {dish.desc && <p style={{ color: '#9CA3AF', fontSize: 11, marginTop: 1 }}>{dish.desc}</p>}
                            </div>
                            {sel && (
                              <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                                <input type="number" min="0" placeholder="Prix" value={catalogPrices[key] || ''} onChange={e => setCatalogPrice(cat.category, dish.name, e.target.value)} style={{ width: 80, padding: '6px 8px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, textAlign: 'right', outline: 'none' }} />
                                <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>F</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>{Object.keys(selectedItems).length} plat(s) selectionne(s)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowCatalog(false)} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#6B7280' }}>Annuler</button>
                <button onClick={importFromCatalog} disabled={importing || Object.keys(selectedItems).length === 0} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#3300FF', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: importing || Object.keys(selectedItems).length === 0 ? 0.5 : 1 }}>{importing ? 'Import en cours...' : 'Importer les plats'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
