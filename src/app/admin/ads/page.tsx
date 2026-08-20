'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminAds() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState([]);
  const [adImages, setAdImages] = useState([]);
  const [impressions, setImpressions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editAd, setEditAd] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', advertiser_name: '', advertiser_type: 'local', link_url: '', monthly_price: '', priority: '0', expires_at: '' });
  const [imageFiles, setImageFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => { checkAdmin(); }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const { data: admin } = await supabase.from('admins').select('*').eq('user_id', user.id).single();
    if (!admin) { router.push('/dashboard'); return; }
    setIsAdmin(true); loadData();
  }

  async function loadData() {
    const { data: a } = await supabase.from('ads').select('*').order('priority', { ascending: false });
    setAds(a || []);
    const { data: imgs } = await supabase.from('ad_images').select('*').order('sort_order');
    setAdImages(imgs || []);
    const { data: imp } = await supabase.from('ad_impressions').select('*');
    setImpressions(imp || []);
    setLoading(false);
  }

  function showToast(msg, type = 'success') {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'success');
    t.textContent = (type === 'error' ? '✗ ' : '✓ ') + msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  async function uploadAdImage(file) {
    const ext = file.name.split('.').pop();
    const name = 'ad_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '.' + ext;
    const { error } = await supabase.storage.from('dish-images').upload(name, file, { contentType: file.type });
    if (error) return '';
    const { data } = supabase.storage.from('dish-images').getPublicUrl(name);
    return data.publicUrl;
  }

  async function saveAd() {
    if (!form.title.trim() || !form.advertiser_name.trim()) { showToast('Remplissez le titre et le nom', 'error'); return; }
    setSaving(true);
    const data = {
      title: form.title.trim(), description: form.description.trim(),
      advertiser_name: form.advertiser_name.trim(), advertiser_type: form.advertiser_type,
      link_url: form.link_url.trim(), monthly_price: parseInt(form.monthly_price) || 0,
      priority: parseInt(form.priority) || 0,
      expires_at: form.expires_at || null,
    };
    let adId;
    if (editAd) {
      await supabase.from('ads').update(data).eq('id', editAd.id);
      adId = editAd.id;
    } else {
      const { data: newAd } = await supabase.from('ads').insert(data).select().single();
      adId = newAd?.id;
    }
    if (adId && imageFiles.length > 0) {
      const existingCount = adImages.filter(i => i.ad_id === adId).length;
      for (let i = 0; i < imageFiles.length; i++) {
        const url = await uploadAdImage(imageFiles[i]);
        if (url) await supabase.from('ad_images').insert({ ad_id: adId, image_url: url, sort_order: existingCount + i });
      }
    }
    setForm({ title: '', description: '', advertiser_name: '', advertiser_type: 'local', link_url: '', monthly_price: '', priority: '0', expires_at: '' });
    setImageFiles([]); setShowForm(false); setEditAd(null); setSaving(false);
    loadData(); showToast(editAd ? 'Publicite modifiee' : 'Publicite ajoutee');
  }

  async function toggleAd(id, active) {
    await supabase.from('ads').update({ is_active: !active }).eq('id', id);
    loadData(); showToast(active ? 'Publicite desactivee' : 'Publicite activee');
  }

  async function deleteAd(id) {
    if (!confirm('Supprimer cette publicite ?')) return;
    await supabase.from('ad_images').delete().eq('ad_id', id);
    await supabase.from('ad_impressions').delete().eq('ad_id', id);
    await supabase.from('ads').delete().eq('id', id);
    loadData(); showToast('Publicite supprimee');
  }

  async function deleteAdImage(imgId) {
    await supabase.from('ad_images').delete().eq('id', imgId);
    loadData(); showToast('Image supprimee');
  }

  function openEdit(ad) {
    setEditAd(ad);
    setForm({ title: ad.title, description: ad.description || '', advertiser_name: ad.advertiser_name, advertiser_type: ad.advertiser_type || 'local', link_url: ad.link_url || '', monthly_price: ad.monthly_price?.toString() || '', priority: ad.priority?.toString() || '0', expires_at: ad.expires_at || '' });
    setImageFiles([]); setShowForm(true);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Verification admin...</div>;
  if (!isAdmin) return null;

  const today = new Date().toISOString().split('T')[0];
  const totalImpressions = impressions.length;
  const todayImpressions = impressions.filter(i => i.viewed_at >= today).length;
  const totalRevenue = ads.reduce((s, a) => s + (a.monthly_price || 0), 0);

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
            <Link href="/admin/catalog" className="px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white">Catalogue</Link>
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-900 shadow-sm">Publicites</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Publicites</h1>
            <p className="text-gray-400 text-sm mt-0.5">Gerez les annonces affichees sur les menus gratuits</p>
          </div>
          <button onClick={() => { setEditAd(null); setForm({ title: '', description: '', advertiser_name: '', advertiser_type: 'local', link_url: '', monthly_price: '', priority: '0', expires_at: '' }); setImageFiles([]); setShowForm(true); }} className="btn-primary text-xs">+ Publicite</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><div className="text-2xl font-bold text-brand-500">{ads.length}</div><div className="text-xs text-gray-400">Publicites</div></div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><div className="text-2xl font-bold text-green-500">{ads.filter(a => a.is_active).length}</div><div className="text-xs text-gray-400">Actives</div></div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><div className="text-2xl font-bold text-amber-500">{totalImpressions}</div><div className="text-xs text-gray-400">Impressions total</div></div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><div className="text-2xl font-bold text-purple-500">{totalRevenue.toLocaleString()} F</div><div className="text-xs text-gray-400">Revenu mensuel</div></div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 border border-brand-200 mb-6">
            <h3 className="font-bold text-sm mb-4">{editAd ? 'Modifier la publicite' : 'Nouvelle publicite'}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Titre *</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="ex: Nouvelle boisson Flag" className="input-field" /></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Annonceur *</label><input type="text" value={form.advertiser_name} onChange={e => setForm({...form, advertiser_name: e.target.value})} placeholder="ex: Brasseries du Senegal" className="input-field" /></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Type</label><select value={form.advertiser_type} onChange={e => setForm({...form, advertiser_type: e.target.value})} className="input-field"><option value="local">Commerce local</option><option value="national">Marque nationale</option><option value="premium">Premium</option><option value="restaurant">Restaurant Outam</option></select></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Prix mensuel (FCFA)</label><input type="number" min="0" value={form.monthly_price} onChange={e => setForm({...form, monthly_price: e.target.value})} placeholder="10000" className="input-field" /></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Lien (URL)</label><input type="text" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})} placeholder="https://..." className="input-field" /></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Expire le</label><input type="date" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} className="input-field" /></div>
              <div className="md:col-span-2"><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description de la publicite..." className="input-field" rows={2} /></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Priorite (0-10)</label><input type="number" min="0" max="10" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="input-field" /></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Images (3 max) ou video courte</label><input type="file" accept="image/*,video/mp4" multiple onChange={e => { const files = Array.from(e.target.files || []); const hasVideo = files.some(f => f.type.startsWith('video')); if (hasVideo && files.length > 1) { showToast('1 seule video par publicite', 'error'); return; } if (!hasVideo && files.length > 3) { showToast('3 images maximum', 'error'); return; } if (files.some(f => f.size > 5 * 1024 * 1024)) { showToast('Fichier trop lourd (5 Mo max)', 'error'); return; } setImageFiles(files); }} className="input-field text-sm" /><p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Images: 1200x600px (ratio 2:1), JPG/PNG, 2 Mo max — Video: MP4, 10s max, 5 Mo max</p></div>
            </div>
            {/* Existing images */}
            {editAd && adImages.filter(i => i.ad_id === editAd.id).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p className="text-xs text-gray-400 mb-2">Images actuelles :</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {adImages.filter(i => i.ad_id === editAd.id).map(img => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <img src={img.image_url} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                      <button onClick={() => deleteAdImage(img.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={saveAd} disabled={saving} className="btn-primary text-sm">{saving ? 'Enregistrement...' : editAd ? 'Modifier' : 'Ajouter'}</button>
              <button onClick={() => { setShowForm(false); setEditAd(null); }} className="btn-ghost text-sm">Annuler</button>
            </div>
          </div>
        )}

        {/* Ads list */}
        {ads.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Aucune publicite. Cliquez sur + pour en creer.</p>
        ) : (
          <div className="space-y-3">
            {ads.map(ad => {
              const imgs = adImages.filter(i => i.ad_id === ad.id);
              const impCount = impressions.filter(i => i.ad_id === ad.id).length;
              const expired = ad.expires_at && new Date(ad.expires_at) < new Date();
              return (
                <div key={ad.id} className="bg-white rounded-2xl p-5 border border-gray-100" style={{ opacity: !ad.is_active || expired ? 0.6 : 1 }}>
                  <div className="flex items-start gap-4">
                    {imgs.length > 0 ? <img src={imgs[0].image_url} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 64, height: 64, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📢</div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-sm">{ad.title}</h3>
                        {ad.is_active && !expired ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">Active</span> : <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">{expired ? 'Expiree' : 'Inactive'}</span>}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{ad.advertiser_type}</span>
                        {imgs.length > 1 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">{imgs.length} images</span>}
                      </div>
                      <p className="text-xs text-gray-500">{ad.advertiser_name}</p>
                      {ad.description && <p className="text-xs text-gray-400 mt-1 truncate">{ad.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                        <span>{impCount} impressions</span>
                        <span>{ad.monthly_price?.toLocaleString() || 0} F/mois</span>
                        {ad.expires_at && <span>Expire le {new Date(ad.expires_at).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 flex-wrap">
                      <button onClick={() => toggleAd(ad.id, ad.is_active)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-500">{ad.is_active ? 'Desactiver' : 'Activer'}</button>
                      <button onClick={() => openEdit(ad)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-500">Modifier</button>
                      <button onClick={() => deleteAd(ad.id)} className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500">Supprimer</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
