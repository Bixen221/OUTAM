'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddDish, setShowAddDish] = useState(false);
  const [editDish, setEditDish] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [dishForm, setDishForm] = useState({ name: '', price: '', description: '', category_id: '', image: null });
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
    setLoading(false);
    generateQR(resto.slug);
  }

  async function generateQR(slug) {
    const QRCode = (await import('qrcode')).default;
    const menuUrl = window.location.origin + '/menu/' + slug;
    const url = await QRCode.toDataURL(menuUrl, { width: 512, margin: 2, color: { dark: '#1A1917', light: '#FFFFFF' } });
    setQrUrl(url);
  }

  async function addCategory() {
    if (!newCatName.trim() || !restaurant) return;
    setSaving(true);
    await supabase.from('categories').insert({ restaurant_id: restaurant.id, name: newCatName.trim(), sort_order: categories.length });
    setNewCatName(''); setShowAddCat(false); setSaving(false); loadData();
  }

  async function deleteCategory(id) {
    if (!confirm('Supprimer cette catégorie et tous ses plats ?')) return;
    await supabase.from('categories').delete().eq('id', id); loadData();
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
    if (!dishForm.name.trim() || !dishForm.price || !dishForm.category_id) { alert('Veuillez remplir le nom, le prix et la catégorie.'); return; }
    setSaving(true);
    let imageUrl = editDish?.image_url || '';
    if (dishForm.image) { imageUrl = await uploadImage(dishForm.image); }
    const data = { name: dishForm.name.trim(), price: parseInt(dishForm.price), description: dishForm.description.trim(), category_id: parseInt(dishForm.category_id), restaurant_id: restaurant.id, image_url: imageUrl };
    if (editDish) { await supabase.from('dishes').update(data).eq('id', editDish.id); }
    else { await supabase.from('dishes').insert({ ...data, sort_order: dishes.length }); }
    setDishForm({ name: '', price: '', description: '', category_id: '', image: null }); setShowAddDish(false); setEditDish(null); setSaving(false); loadData();
  }

  async function toggleDish(id, available) { await supabase.from('dishes').update({ is_available: !available }).eq('id', id); loadData(); }
  async function deleteDish(id) { if (!confirm('Supprimer ce plat ?')) return; await supabase.from('dishes').delete().eq('id', id); loadData(); }

  function openEditDish(dish) {
    setEditDish(dish);
    setDishForm({ name: dish.name, price: dish.price.toString(), description: dish.description || '', category_id: dish.category_id.toString(), image: null });
    setShowAddDish(true);
  }

  async function logout() { await supabase.auth.signOut(); router.push('/'); }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement...</div>;
  const menuUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/menu/' + restaurant?.slug;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-bold">Ou<span className="text-brand-500">tam</span></Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings" className="btn-ghost text-xs">Profil</Link>
            <Link href={'/menu/' + restaurant?.slug} target="_blank" className="btn-ghost text-xs">Voir mon menu</Link>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Déconnexion</button>
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold">{restaurant?.name}</h1>
              <p className="text-gray-400 text-sm mt-1">{restaurant?.address || 'Adresse non renseignée'}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center"><div className="text-2xl font-bold text-brand-500">{dishes.length}</div><div className="text-xs text-gray-400">Plats</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-brand-500">{categories.length}</div><div className="text-xs text-gray-400">Catégories</div></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
          <h2 className="font-bold text-lg mb-4">Partagez votre menu</h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            {qrUrl && (<div className="text-center"><img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-xl border" /><a href={qrUrl} download={'qr-' + restaurant?.slug + '.png'} className="text-xs text-brand-500 font-medium mt-2 block hover:underline">Télécharger le QR code</a></div>)}
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-2">Lien de votre menu :</p>
              <div className="flex gap-2"><input type="text" value={menuUrl} readOnly className="input-field text-sm flex-1" /><button onClick={() => { navigator.clipboard.writeText(menuUrl); alert('Lien copié !'); }} className="btn-primary text-sm px-4">Copier</button></div>
              <p className="text-xs text-gray-400 mt-2">Partagez ce lien sur WhatsApp, Facebook ou imprimez le QR code pour vos tables.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Catégories</h2><button onClick={() => setShowAddCat(true)} className="btn-primary text-sm">+ Catégorie</button></div>
        {showAddCat && (<div className="bg-white rounded-2xl p-4 border border-brand-200 mb-4 flex gap-3"><input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nom de la catégorie (ex: Entrées, Plats, Boissons...)" className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && addCategory()} autoFocus /><button onClick={addCategory} disabled={saving} className="btn-primary text-sm">{saving ? '...' : 'Ajouter'}</button><button onClick={() => setShowAddCat(false)} className="btn-ghost text-sm">Annuler</button></div>)}
        {categories.length === 0 ? (<div className="text-center py-8 text-gray-400"><p className="text-3xl mb-2">📂</p><p>Aucune catégorie. Commencez par en créer une.</p></div>) : (<div className="flex flex-wrap gap-2 mb-6">{categories.map((cat) => (<div key={cat.id} className="bg-white rounded-full px-4 py-2 border border-gray-200 flex items-center gap-2 text-sm"><span className="font-medium">{cat.name}</span><span className="text-gray-400">({dishes.filter(d => d.category_id === cat.id).length})</span><button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-600 text-xs ml-1">×</button></div>))}</div>)}
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Plats</h2>{categories.length > 0 && (<button onClick={() => { setEditDish(null); setDishForm({ name: '', price: '', description: '', category_id: categories[0]?.id?.toString() || '', image: null }); setShowAddDish(true); }} className="btn-primary text-sm">+ Ajouter un plat</button>)}</div>
        {showAddDish && (<div className="bg-white rounded-2xl p-6 border border-brand-200 mb-6"><h3 className="font-bold mb-4">{editDish ? 'Modifier le plat' : 'Nouveau plat'}</h3><div className="grid md:grid-cols-2 gap-4"><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Nom du plat *</label><input type="text" value={dishForm.name} onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })} placeholder="ex: Thiéboudienne" className="input-field" /></div><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Prix (FCFA) *</label><input type="number" value={dishForm.price} onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })} placeholder="ex: 3500" className="input-field" /></div><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Catégorie *</label><select value={dishForm.category_id} onChange={(e) => setDishForm({ ...dishForm, category_id: e.target.value })} className="input-field">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Photo (facultatif)</label><input type="file" accept="image/*" onChange={(e) => setDishForm({ ...dishForm, image: e.target.files?.[0] || null })} className="input-field text-sm" /></div><div className="md:col-span-2"><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Description (facultatif)</label><textarea value={dishForm.description} onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })} placeholder="Décrivez le plat..." className="input-field" rows={2} /></div></div><div className="flex gap-3 mt-4"><button onClick={saveDish} disabled={saving} className="btn-primary text-sm">{saving ? 'Enregistrement...' : editDish ? 'Modifier' : 'Ajouter le plat'}</button><button onClick={() => { setShowAddDish(false); setEditDish(null); }} className="btn-ghost text-sm">Annuler</button></div></div>)}
        {dishes.length === 0 ? (<div className="text-center py-8 text-gray-400"><p className="text-3xl mb-2">🍽️</p><p>Aucun plat. Ajoutez des catégories puis des plats.</p></div>) : (<div className="space-y-3">{categories.map((cat) => { const catDishes = dishes.filter(d => d.category_id === cat.id); if (!catDishes.length) return null; return (<div key={cat.id}><h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">{cat.name}</h3>{catDishes.map((dish) => (<div key={dish.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 mb-2 hover:border-brand-200 transition-colors">{dish.image_url && (<img src={dish.image_url} alt={dish.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />)}<div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className={'font-semibold ' + (!dish.is_available ? 'line-through text-gray-400' : '')}>{dish.name}</span>{!dish.is_available && <span className="badge bg-red-50 text-red-500">Indisponible</span>}</div><p className="text-sm text-gray-400 truncate">{dish.description}</p></div><div className="text-right flex-shrink-0"><div className="font-bold text-brand-500">{dish.price.toLocaleString()} F</div><div className="flex items-center gap-1 mt-1"><button onClick={() => toggleDish(dish.id, dish.is_available)} className={'text-xs px-2 py-1 rounded-full ' + (dish.is_available ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400')}>{dish.is_available ? 'Dispo' : 'Off'}</button><button onClick={() => openEditDish(dish)} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-500">Modifier</button><button onClick={() => deleteDish(dish.id)} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">×</button></div></div></div>))}</div>); })}</div>)}
      </div>
    </div>
  );
}
