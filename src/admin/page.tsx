'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
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
    setLoading(false);
  }

  async function deleteRestaurant(id: string, name: string) {
    if (!confirm(`Supprimer le restaurant "${name}" et tous ses plats ? Cette action est irréversible.`)) return;
    await supabase.from('dishes').delete().eq('restaurant_id', id);
    await supabase.from('categories').delete().eq('restaurant_id', id);
    await supabase.from('restaurants').delete().eq('id', id);
    loadAll();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Vérification des droits admin...</div>;
  if (!isAdmin) return null;

  const filteredRestos = restaurants.filter(r =>
    !search || (r.name + ' ' + r.slug + ' ' + r.address).toLowerCase().includes(search.toLowerCase())
  );

  const totalDishes = dishes.length;
  const totalRestos = restaurants.length;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Admin header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-xl font-bold">Ou<span className="text-brand-300">tam</span></Link>
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">Mon restaurant</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-sm text-gray-400 hover:text-red-400 transition-colors">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-2">Administration Outam</h1>
        <p className="text-gray-400 mb-8">Gérez tous les restaurants de la plateforme.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
            <div className="text-3xl font-bold text-brand-500">{totalRestos}</div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Restaurants</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
            <div className="text-3xl font-bold text-brand-500">{totalDishes}</div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Plats au total</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
            <div className="text-3xl font-bold text-green-500">{restaurants.filter(r => dishes.some(d => d.restaurant_id === r.id)).length}</div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Restos actifs</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
            <div className="text-3xl font-bold text-amber-500">{restaurants.filter(r => !dishes.some(d => d.restaurant_id === r.id)).length}</div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Sans plats</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-3 border border-gray-100 mb-6 flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un restaurant..."
            className="flex-1 px-4 py-2 outline-none text-sm bg-transparent"
          />
          {search && <button onClick={() => setSearch('')} className="text-gray-400 text-sm px-3">✕</button>}
        </div>

        {/* Restaurants list */}
        <div className="space-y-3">
          {filteredRestos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-2xl mb-2">🍽️</p>
              <p>Aucun restaurant trouvé</p>
            </div>
          ) : filteredRestos.map((r) => {
            const restoDishe = dishes.filter(d => d.restaurant_id === r.id);
            return (
              <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-brand-200 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  {r.logo_url ? (
                    <img src={r.logo_url} alt={r.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ background: (r.theme_color || '#3300FF') + '15', color: r.theme_color || '#3300FF' }}>
                      {r.name[0]?.toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-lg">{r.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 font-medium">{restoDishe.length} plats</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{r.address || 'Pas d\'adresse'} · {r.phone || 'Pas de téléphone'}</p>
                    <p className="text-xs text-gray-300 mt-0.5">Slug: /{r.slug} · Créé le {new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/menu/${r.slug}`} target="_blank" className="btn-ghost text-xs">Voir le menu</Link>
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
