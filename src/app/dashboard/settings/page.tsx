'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Settings() {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', address:'', phone:'', description:'', theme_color:'#3300FF', email:'' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [msg, setMsg] = useState('');
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single();
    if (!resto) { router.push('/auth/signup'); return; }
    setRestaurant(resto);
    setForm({ name: resto.name||'', address: resto.address||'', phone: resto.phone||'', description: resto.description||'', theme_color: resto.theme_color||'#3300FF', email: resto.email||'' });
    if (resto.logo_url) setLogoPreview(resto.logo_url);
    setLoading(false);
  }

  function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image trop lourde (2 Mo max)'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result);
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true); setMsg('');
    let logoUrl = restaurant.logo_url || '';
    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const name = 'logo_' + restaurant.id + '_' + Date.now() + '.' + ext;
      const { error: upErr } = await supabase.storage.from('restaurant-logos').upload(name, logoFile, { contentType: logoFile.type, upsert: true });
      if (!upErr) { const { data } = supabase.storage.from('restaurant-logos').getPublicUrl(name); logoUrl = data.publicUrl; }
    }
    const { error } = await supabase.from('restaurants').update({
      name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim(),
      description: form.description.trim(), theme_color: form.theme_color, logo_url: logoUrl,
    }).eq('id', restaurant.id);
    setMsg(error ? 'Erreur lors de la sauvegarde.' : 'Profil mis à jour !');
    setSaving(false); setLogoFile(null);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-brand-500 font-medium hover:underline">← Dashboard</Link>
          <span className="font-display text-xl font-bold">Ou<span className="text-brand-500">tam</span></span>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold mb-1">Profil du restaurant</h1>
        <p className="text-gray-400 text-sm mb-6">Ces informations sont visibles sur votre menu public.</p>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Logo</label>
            <div className="flex items-center gap-5">
              {logoPreview ? <img src={logoPreview} alt="" className="w-20 h-20 rounded-2xl object-cover border" /> : <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 text-2xl font-bold border border-brand-100">{form.name?.[0]?.toUpperCase()||'?'}</div>}
              <div><label className="btn-ghost text-sm cursor-pointer inline-block">Changer<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogo} /></label><p className="text-xs text-gray-400 mt-1">JPG, PNG — 2 Mo max</p></div>
            </div>
          </div>
          <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Nom du restaurant *</label><input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input-field" /></div>
          <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Adresse</label><input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="input-field" placeholder="ex: Rue 10, Médina, Dakar" /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Téléphone</label><input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="input-field" placeholder="+221 77 000 00 00" /></div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" placeholder="contact@monresto.sn" /></div>
          </div>
          <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Description</label><textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="input-field" rows={3} placeholder="Décrivez votre restaurant..." /></div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Couleur du menu</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.theme_color} onChange={(e) => setForm({...form, theme_color: e.target.value})} className="w-10 h-10 rounded-xl border cursor-pointer p-1" />
              <div className="flex gap-1.5">{['#3300FF','#DC2626','#16A34A','#D97706','#7C3AED','#0284C7','#0F766E','#C026D3'].map((c) => <button key={c} onClick={() => setForm({...form, theme_color: c})} className={'w-7 h-7 rounded-full border-2 transition-all ' + (form.theme_color === c ? 'border-gray-900 scale-110' : 'border-transparent')} style={{ background: c }} />)}</div>
            </div>
          </div>
          {msg && <p className={'text-sm p-3 rounded-xl ' + (msg.includes('Erreur') ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600')}>{msg}</p>}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            <Link href="/dashboard" className="btn-ghost text-sm flex items-center">Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
