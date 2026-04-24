'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [scans, setScans] = useState([]);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => { checkAdmin(); }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const { data: admin } = await supabase.from('admins').select('*').eq('user_id', user.id).single();
    if (!admin) { router.push('/dashboard'); return; }
    setIsAdmin(true);
    loadAll();
  }

  async function loadAll() {
    const { data: restos } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    setRestaurants(restos || []);
    const { data: d } = await supabase.from('dishes').select('*');
    setDishes(d || []);
    const { data: s } = await supabase.from('menu_scans').select('*');
    setScans(s || []);
    setLoading(false);
  }

  async function deleteRestaurant(id, name) {
    if (!confirm('Supprimer "' + name + '" et tous ses plats ?')) return;
    await supabase.from('dishes').delete().eq('restaurant_id', id);
    await supabase.from('categories').delete().eq('restaurant_id', id);
    await supabase.from('menu_scans').delete().eq('restaurant_id', id);
    await supabase.from('restaurants').delete().eq('id', id);
    loadAll();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Verification admin...</div>;
  if (!isAdmin) return null;

  const filtered = restaurants.filter(r => !search || (r.name + ' ' + r.slug + ' ' + r.address).toLowerCase().includes(search.toLowerCase()));
  const totalScans = scans.length;
  const today = new Date().toISOString().split('T')[0];
  const scansToday = scans.filter(s => s.scanned_at >= today).length;

  function getScansForResto(id) { return scans.filter(s => s.restaurant_id === id).length; }
  function getScansToday(id) { return scans.filter(s => s.restaurant_id === id && s.scanned_at >= today).length; }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-xl font-bold"><img src="/icon.png" alt="Outam" className="h-8 w-auto" /></Link>
            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">Mon resto</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-sm text-gray-400 hover:text-red-400">Deconnexion</button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Dashboard Admin</h1>
        <p className="text-gray-400 mb-6">Vue d ensemble de la plateforme Outam</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center"><div className="text-3xl font-bold text-brand-500">{restaurants.length}</div><div className="text-xs text-gray-400 mt-1">Restaurants</div></div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center"><div className="text-3xl font-bold text-brand-500">{dishes.length}</div><div className="text-xs text-gray-400 mt-1">Plats</div></div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center"><div className="text-3xl font-bold text-green-500">{totalScans}</div><div className="text-xs text-gray-400 mt-1">Scans total</div></div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center"><div className="text-3xl font-bold text-amber-500">{scansToday}</div><div className="text-xs text-gray-400 mt-1">Scans aujourd hui</div></div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center"><div className="text-3xl font-bold text-purple-500">{restaurants.length ? Math.round(totalScans / restaurants.length) : 0}</div><div className="text-xs text-gray-400 mt-1">Moy. scans/resto</div></div>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100 mb-6 flex gap-2">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un restaurant..." className="flex-1 px-4 py-2 outline-none text-sm bg-transparent" />
          {search && <button onClick={() => setSearch('')} className="text-gray-400 text-sm px-3">x</button>}
        </div>
        <h2 className="font-bold text-lg mb-3">Tous les restaurants ({filtered.length})</h2>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Aucun restaurant trouve.</p>
          ) : filtered.map((r) => {
            const rDishes = dishes.filter(d => d.restaurant_id === r.id);
            const rScans = getScansForResto(r.id);
            const rToday = getScansToday(r.id);
            return (
              <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-brand-200 transition-colors">
                <div className="flex items-center gap-4">
                  {r.logo_url ? <img src={r.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" /> : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: (r.theme_color||'#3300FF') + '15', color: r.theme_color||'#3300FF' }}>{r.name[0]}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-bold">{r.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 font-medium">{rDishes.length} plats</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">{rScans} scans</span>
                      {rToday > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">{rToday} aujourd hui</span>}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{r.address || 'Pas d adresse'}{r.phone ? ' - ' + r.phone : ''}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">/{r.slug} - {new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={'/menu/' + r.slug} target="_blank" className="btn-ghost text-xs">Menu</Link>
                    <button onClick={() => deleteRestaurant(r.id, r.name)} className="btn-danger text-xs">Supprimer</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
