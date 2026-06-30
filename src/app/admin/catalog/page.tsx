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
  const [dishForm, setDishForm] = useState({ name: '', description: '', category_id: '' });
  const [editDish, setEditDish] = useState(null);
  const [saving, setSaving] = useState(false);
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
    const { data: cats } = await supabase.from('catalog_categories').select('*').order('sort_order');
    setCategories(cats || []);
    const { data: d } = await supabase.from('catalog_dishes').select('*').order('sort_order');
    setDishes(d || []);
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
    if (!confirm('Supprimer cette categorie et tous ses plats du catalogue ?')) return;
    await supabase.from('catalog_dishes').delete().eq('category_id', id);
    await supabase.from('catalog_categories').delete().eq('id', id);
    loadData(); showToast('Categorie supprimee');
  }

  async function addDish() {
    if (!dishForm.name.trim() || !dishForm.category_id) { showToast('Remplissez le nom et la categorie', 'error'); return; }
    setSaving(true);
    const catDishes = dishes.filter(d => d.category_id === parseInt(dishForm.category_id));
    await supabase.from('catalog_dishes').insert({ name: dishForm.name.trim(), description: dishForm.description.trim(), category_id: parseInt(dishForm.category_id), sort_order: catDishes.length });
    setDishForm({ name: '', description: '', category_id: '' }); setShowAddDish(false); setSaving(false); loadData(); showToast('Plat ajoute au catalogue');
  }

  async function updateDish() {
    if (!editDish || !editDish.name.trim()) return;
    setSaving(true);
    await supabase.from('catalog_dishes').update({ name: editDish.name, description: editDish.description, category_id: editDish.category_id }).eq('id', editDish.id);
    setEditDish(null); setSaving(false); loadData(); showToast('Plat modifie');
  }

  async function deleteDish(id) {
    if (!confirm('Supprimer ce plat du catalogue ?')) return;
    await supabase.from('catalog_dishes').delete().eq('id', id);
    loadData(); showToast('Plat supprime');
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
            <button onClick={() => setShowAddCat(true)} className="btn-ghost text-xs">+ Categorie</button>
            <button onClick={() => { setDishForm({ name: '', description: '', category_id: categories[0]?.id?.toString() || '' }); setShowAddDish(true); }} className="btn-primary text-xs">+ Plat</button>
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
              <div className="md:col-span-2">
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
              <div className="md:col-span-2">
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
      </div>
    </div>
  );
}
