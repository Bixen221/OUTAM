'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminCatalog() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', emoji: '' });
  const [editCat, setEditCat] = useState(null);
  const [showAddDish, setShowAddDish] = useState(false);
  const [dishForm, setDishForm] = useState({ name: '', description: '', category_id: '', image: null });
  const [editDish, setEditDish] = useState(null);
  const [editDishImage, setEditDishImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashedCats, setTrashedCats] = useState([]);
  const [trashedDishes, setTrashedDishes] = useState([]);
  const router = useRouter();

  useEffect(() => { checkAdmin(); }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const { data: admin } = await supabase.from('admins').select('*').eq('user_id', user.id).single();
    if (!admin) { router.push('/dashboard'); return; }
    setIsAdmin(true);
    loadData();
  }

  async function loadData() {
    const { data: cats } = await supabase.from('catalog_categories').select('*').is('deleted_at', null).order('sort_order');
    setCategories(cats || []);
    const { data: d } = await supabase.from('catalog_dishes').select('*').is('deleted_at', null).order('sort_order');
    setDishes(d || []);
    const { data: tCats } = await supabase.from('catalog_categories').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    setTrashedCats(tCats || []);
    const { data: tDishes } = await supabase.from('catalog_dishes').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    setTrashedDishes(tDishes || []);
    setLoading(false);
  }

  function showToast(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) { container = document.createElement('div'); container.id = 'toast-container'; container.className = 'toast-container'; document.body.appendChild(container); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  async function addCategory() {
    if (!newCat.name.trim()) return;
    setSaving(true);
    await supabase.from('catalog_categories').insert({ name: newCat.name.trim(), emoji: newCat.emoji || '🍽️', sort_order: categories.length });
    setNewCat({ name: '', emoji: '' }); setShowAddCat(false); setSaving(false); loadData(); showToast('Categorie ajoutee');
  }

  async function updateCategory() {
    if (!editCat || !editCat.name.trim()) return;
    setSaving(true);
    await supabase.from('catalog_categories').update({ name: editCat.name, emoji: editCat.emoji }).eq('id', editCat.id);
    setEditCat(null); setSaving(false); loadData(); showToast('Categorie modifiee');
  }

  async function deleteCategory(id) {
    if (!confirm('Supprimer cette categorie et ses plats ? Vous pourrez les restaurer depuis la corbeille.')) return;
    const now = new Date().toISOString();
    await supabase.from('catalog_dishes').update({ deleted_at: now }).eq('category_id', id).is('deleted_at', null);
    await supabase.from('catalog_categories').update({ deleted_at: now }).eq('id', id);
    loadData(); showToast('Categorie mise a la corbeille');
  }

  async function restoreCategory(id) {
    await supabase.from('catalog_categories').update({ deleted_at: null }).eq('id', id);
    await supabase.from('catalog_dishes').update({ deleted_at: null }).eq('category_id', id);
    loadData(); showToast('Categorie restauree');
  }

  async function permanentDeleteCategory(id) {
    if (!confirm('Supprimer definitivement ? Cette action est irreversible.')) return;
    await supabase.from('catalog_dishes').delete().eq('category_id', id);
    await supabase.from('catalog_categories').delete().eq('id', id);
    loadData(); showToast('Categorie supprimee definitivement');
  }

  async function uploadCatalogImage(file) {
    const ext = file.name.split('.').pop();
    const name = 'catalog_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '.' + ext;
    const { error } = await supabase.storage.from('dish-images').upload(name, file, { contentType: file.type });
    if (error) return '';
    const { data } = supabase.storage.from('dish-images').getPublicUrl(name);
    return data.publicUrl;
  }

  async function addDish() {
    if (!dishForm.name.trim() || !dishForm.category_id) { showToast('Remplissez le nom et la categorie', 'error'); return; }
    setSaving(true);
    const catDishes = dishes.filter(d => d.category_id === parseInt(dishForm.category_id));
    let imgUrl = '';
    if (dishForm.image) { imgUrl = await uploadCatalogImage(dishForm.image); }
    await supabase.from('catalog_dishes').insert({ name: dishForm.name.trim(), description: dishForm.description.trim(), category_id: parseInt(dishForm.category_id), sort_order: catDishes.length, image_url: imgUrl });
    setDishForm({ name: '', description: '', category_id: '', image: null }); setShowAddDish(false); setSaving(false); loadData(); showToast('Plat ajoute au catalogue');
  }

  async function updateDish() {
    if (!editDish || !editDish.name.trim()) return;
    setSaving(true);
    let editImgUrl = editDish.image_url || '';
    if (editDishImage) { editImgUrl = await uploadCatalogImage(editDishImage); }
    await supabase.from('catalog_dishes').update({ name: editDish.name, description: editDish.description, category_id: editDish.category_id, image_url: editImgUrl }).eq('id', editDish.id);
    setEditDish(null); setEditDishImage(null); setSaving(false); loadData(); showToast('Plat modifie');
  }

  async function deleteDish(id) {
    await supabase.from('catalog_dishes').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    loadData(); showToast('Plat mis a la corbeille');
  }

  async function restoreDish(id) {
    await supabase.from('catalog_dishes').update({ deleted_at: null }).eq('id', id);
    loadData(); showToast('Plat restaure');
  }

  async function permanentDeleteDish(id) {
    if (!confirm('Supprimer definitivement ?')) return;
    await supabase.from('catalog_dishes').delete().eq('id', id);
    loadData(); showToast('Plat supprime definitivement');
  }

  async function emptyTrash() {
    if (!confirm('Vider la corbeille ? Cette action est irreversible.')) return;
    for (const c of trashedCats) { await supabase.from('catalog_dishes').delete().eq('category_id', c.id); await supabase.from('catalog_categories').delete().eq('id', c.id); }
    for (const d of trashedDishes) { await supabase.from('catalog_dishes').delete().eq('id', d.id); }
    loadData(); showToast('Corbeille videe');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Verification admin...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2"><img src="/icon.png" alt="Outam" className="h-9 w-auto" /></Link>
            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">ADMIN</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
            <Link href="/admin" className="px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white">Restaurants</Link>
            <Link href="/admin/analytics" className="px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white">Analytics</Link>
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-900 shadow-sm">Catalogue</span>
              <Link href="/admin/ads" className="px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white">Publicites</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Catalogue de plats</h1>
            <p className="text-gray-400 text-sm mt-0.5">Gerez les plats et categories que les restaurants peuvent importer</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTrash(!showTrash)} className="btn-ghost text-xs" style={{ position: 'relative' }}>{showTrash ? 'Catalogue' : 'Corbeille'}{!showTrash && (trashedCats.length + trashedDishes.length) > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{trashedCats.length + trashedDishes.length}</span>}</button>
            <button onClick={() => setShowAddCat(true)} className="btn-ghost text-xs">+ Categorie</button>
            <button onClick={() => { setDishForm({ name: '', description: '', category_id: categories[0]?.id?.toString() || '', image: null }); setShowAddDish(true); }} className="btn-primary text-xs">+ Plat</button>
          </div>
        </div>

        {/* Add category form */}
        {showAddCat && (
          <div className="bg-white rounded-2xl p-5 border border-brand-200 mb-4">
            <h3 className="font-bold text-sm mb-3">Nouvelle categorie</h3>
            <div className="flex gap-3">
              <input type="text" value={newCat.emoji} onChange={e => setNewCat({...newCat, emoji: e.target.value})} placeholder="Emoji" className="input-field" style={{width: 70}} />
              <input type="text" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} placeholder="Nom de la categorie" className="input-field flex-1" onKeyDown={e => e.key === 'Enter' && addCategory()} autoFocus />
              <button onClick={addCategory} disabled={saving} className="btn-primary text-xs">{saving ? '...' : 'Ajouter'}</button>
              <button onClick={() => setShowAddCat(false)} className="btn-ghost text-xs">Annuler</button>
            </div>
          </div>
        )}

        {/* Edit category form */}
        {editCat && (
          <div className="bg-white rounded-2xl p-5 border border-amber-200 mb-4">
            <h3 className="font-bold text-sm mb-3">Modifier la categorie</h3>
            <div className="flex gap-3">
              <input type="text" value={editCat.emoji} onChange={e => setEditCat({...editCat, emoji: e.target.value})} className="input-field" style={{width: 70}} />
              <input type="text" value={editCat.name} onChange={e => setEditCat({...editCat, name: e.target.value})} className="input-field flex-1" onKeyDown={e => e.key === 'Enter' && updateCategory()} autoFocus />
              <button onClick={updateCategory} disabled={saving} className="btn-primary text-xs">{saving ? '...' : 'Enregistrer'}</button>
              <button onClick={() => setEditCat(null)} className="btn-ghost text-xs">Annuler</button>
            </div>
          </div>
        )}

        {/* Add dish form */}
        {showAddDish && (
          <div className="bg-white rounded-2xl p-5 border border-brand-200 mb-4">
            <h3 className="font-bold text-sm mb-3">{editDish ? 'Modifier le plat' : 'Nouveau plat au catalogue'}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Nom *</label>
                <input type="text" value={dishForm.name} onChange={e => setDishForm({...dishForm, name: e.target.value})} placeholder="ex: Thieboudienne" className="input-field" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Categorie *</label>
                <select value={dishForm.category_id} onChange={e => setDishForm({...dishForm, category_id: e.target.value})} className="input-field">
                  <option value="">Choisir...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Photo</label>
                <input type="file" accept="image/*" onChange={e => setDishForm({...dishForm, image: e.target.files?.[0] || null})} className="input-field text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Description</label>
                <textarea value={dishForm.description} onChange={e => setDishForm({...dishForm, description: e.target.value})} placeholder="Description du plat..." className="input-field" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addDish} disabled={saving} className="btn-primary text-sm">{saving ? '...' : 'Ajouter'}</button>
              <button onClick={() => { setShowAddDish(false); setEditDish(null); }} className="btn-ghost text-sm">Annuler</button>
            </div>
          </div>
        )}

        {/* Edit dish form */}
        {editDish && (
          <div className="bg-white rounded-2xl p-5 border border-amber-200 mb-4">
            <h3 className="font-bold text-sm mb-3">Modifier le plat</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Nom *</label>
                <input type="text" value={editDish.name} onChange={e => setEditDish({...editDish, name: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Categorie *</label>
                <select value={editDish.category_id} onChange={e => setEditDish({...editDish, category_id: parseInt(e.target.value)})} className="input-field">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {editDish.image_url && <img src={editDish.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />}
                  <input type="file" accept="image/*" onChange={e => setEditDishImage(e.target.files?.[0] || null)} className="input-field text-sm" style={{ flex: 1 }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Description</label>
                <textarea value={editDish.description} onChange={e => setEditDish({...editDish, description: e.target.value})} className="input-field" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={updateDish} disabled={saving} className="btn-primary text-sm">{saving ? '...' : 'Enregistrer'}</button>
              <button onClick={() => setEditDish(null)} className="btn-ghost text-sm">Annuler</button>
            </div>
          </div>
        )}

        {/* Categories and dishes list */}
        {categories.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Aucune categorie dans le catalogue.</p>
        ) : categories.map(cat => {
          const catDishes = dishes.filter(d => d.category_id === cat.id);
          return (
            <div key={cat.id} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.emoji}</span>
                  <h2 className="font-bold text-lg">{cat.name}</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{catDishes.length} plats</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditCat({...cat})} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-500">Modifier</button>
                  <button onClick={() => deleteCategory(cat.id)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">Supprimer</button>
                </div>
              </div>
              <div className="space-y-2">
                {catDishes.map(dish => (
                  <div key={dish.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 hover:border-brand-200 transition-colors">
                    {dish.image_url ? <img src={dish.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🍽️</div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{dish.name}</p>
                      {dish.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{dish.description}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setEditDish({...dish}); setShowAddDish(false); }} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-500">Modifier</button>
                      <button onClick={() => deleteDish(dish.id)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">Supprimer</button>
                    </div>
                  </div>
                ))}
                {catDishes.length === 0 && <p className="text-sm text-gray-400 py-3 text-center">Aucun plat dans cette categorie</p>}
              </div>
            </div>
          );
        })}
        {/* Trash */}
        {showTrash && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg">Corbeille</h2>
                <p className="text-gray-400 text-sm">{trashedCats.length + trashedDishes.length} element(s) supprime(s)</p>
              </div>
              {(trashedCats.length + trashedDishes.length) > 0 && <button onClick={emptyTrash} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">Vider la corbeille</button>}
            </div>

            {trashedCats.length === 0 && trashedDishes.length === 0 ? (
              <p className="text-center text-gray-400 py-12">La corbeille est vide</p>
            ) : (
              <div className="space-y-2">
                {trashedCats.map(cat => (
                  <div key={'cat-' + cat.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 opacity-60">
                    <span className="text-xl">{cat.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{cat.name}</p>
                      <p className="text-xs text-gray-400">Categorie — supprimee le {new Date(cat.deleted_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => restoreCategory(cat.id)} className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600 hover:bg-green-100">Restaurer</button>
                      <button onClick={() => permanentDeleteCategory(cat.id)} className="text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-400 hover:bg-red-100">Supprimer</button>
                    </div>
                  </div>
                ))}
                {trashedDishes.map(dish => {
                  const cat = [...categories, ...trashedCats].find(c => c.id === dish.category_id);
                  return (
                    <div key={'dish-' + dish.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 opacity-60">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{dish.name}</p>
                        <p className="text-xs text-gray-400">{cat ? cat.name : 'Categorie inconnue'} — supprime le {new Date(dish.deleted_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => restoreDish(dish.id)} className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600 hover:bg-green-100">Restaurer</button>
                        <button onClick={() => permanentDeleteDish(dish.id)} className="text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-400 hover:bg-red-100">Supprimer</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
