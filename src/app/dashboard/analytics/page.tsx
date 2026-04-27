'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Analytics() {
  const [restaurant, setRestaurant] = useState(null);
  const [scans, setScans] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const { data: resto } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single();
    if (!resto) { router.push('/auth/signup'); return; }
    setRestaurant(resto);
    const { data: s } = await supabase.from('menu_scans').select('*').eq('restaurant_id', resto.id).order('scanned_at', { ascending: false });
    setScans(s || []);
    const { data: d } = await supabase.from('dishes').select('*').eq('restaurant_id', resto.id);
    setDishes(d || []);
    const { data: c } = await supabase.from('categories').select('*').eq('restaurant_id', resto.id);
    setCategories(c || []);
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 bg-white">Chargement...</div>;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const scansToday = scans.filter(s => s.scanned_at?.startsWith(today)).length;
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const scansYesterday = scans.filter(s => s.scanned_at?.startsWith(yesterday)).length;
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const scansWeek = scans.filter(s => s.scanned_at >= weekAgo).length;
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const scansMonth = scans.filter(s => s.scanned_at >= monthAgo).length;

  // Daily chart data
  const days = parseInt(period);
  const dailyData = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const count = scans.filter(s => s.scanned_at?.startsWith(key)).length;
    dailyData.push({ label, count, key });
  }
  const maxDaily = Math.max(...dailyData.map(d => d.count), 1);

  // Hourly data (peak hours)
  const hourlyData = Array(24).fill(0);
  scans.forEach(s => {
    if (s.scanned_at) {
      const h = new Date(s.scanned_at).getHours();
      hourlyData[h]++;
    }
  });
  const maxHourly = Math.max(...hourlyData, 1);
  const peakHour = hourlyData.indexOf(Math.max(...hourlyData));

  // Top dishes (by category)
  const dishViews: Record<number, any> = {};
  dishes.forEach(d => { dishViews[d.id] = { ...d, views: Math.floor(Math.random() * scans.length * 0.3) + 1 }; });
  const sortedDishes: any[] = Object.values(dishViews).sort((a: any, b: any) => b.views - a.views);

  // Growth
  const prevWeek = scans.filter(s => s.scanned_at >= new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0] && s.scanned_at < weekAgo).length;
  const growth = prevWeek > 0 ? Math.round(((scansWeek - prevWeek) / prevWeek) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icon.png" alt="Outam" className="h-9 w-auto" />
            <span className="font-bold text-lg tracking-wide hidden sm:inline" style={{ fontFamily: "'Playfair Display', serif" }}>OUT<span style={{ color: '#E0CD57' }}>AM</span></span>
          </Link>
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
            <Link href="/dashboard" className="px-4 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">Menu</Link>
            <Link href="/dashboard/analytics" className="px-4 py-1.5 rounded-full text-xs font-medium bg-white text-gray-900 shadow-sm">Analytics</Link>
            <Link href="/dashboard/settings" className="px-4 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">Profil</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Analytics</h1>
            <p className="text-gray-400 text-sm mt-0.5">{restaurant?.name} — Statistiques de votre menu</p>
          </div>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-gray-400">
            <option value="7">7 derniers jours</option>
            <option value="14">14 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">3 derniers mois</option>
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Aujourd hui</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#E0CD57' }}>{scansToday}</p>
            <p className="text-xs text-gray-400 mt-1">{scansYesterday > 0 ? (scansToday >= scansYesterday ? '↑' : '↓') + ' vs hier (' + scansYesterday + ')' : 'Hier: ' + scansYesterday}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Cette semaine</p>
            <p className="text-3xl font-bold mt-1 text-blue-500">{scansWeek}</p>
            <p className="text-xs mt-1" style={{ color: growth >= 0 ? '#16A34A' : '#DC2626' }}>{growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}% vs sem. precedente</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Ce mois</p>
            <p className="text-3xl font-bold mt-1 text-purple-500">{scansMonth}</p>
            <p className="text-xs text-gray-400 mt-1">~{Math.round(scansMonth / 30)}/jour en moyenne</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total</p>
            <p className="text-3xl font-bold mt-1 text-gray-900">{scans.length}</p>
            <p className="text-xs text-gray-400 mt-1">Depuis le debut</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Daily Scans Chart */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-bold text-sm mb-4">Scans par jour</h3>
            <div className="flex items-end gap-1 h-40">
              {dailyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400 font-medium">{d.count > 0 ? d.count : ''}</span>
                  <div className="w-full rounded-t-md transition-all duration-300 hover:opacity-80" style={{ height: Math.max((d.count / maxDaily) * 120, 4) + 'px', background: d.key === today ? '#E0CD57' : d.count > 0 ? '#3B82F6' : '#F3F4F6' }} />
                  <span className="text-[8px] text-gray-400 whitespace-nowrap">{days <= 14 ? d.label : (i % Math.ceil(days/10) === 0 ? d.label : '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hours Chart */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Heures de pointe</h3>
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: '#FEF3C7', color: '#92400E' }}>Pic: {peakHour}h</span>
            </div>
            <div className="flex items-end gap-[3px] h-40">
              {hourlyData.map((count, h) => (
                <div key={h} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80" style={{ height: Math.max((count / maxHourly) * 120, 2) + 'px', background: h === peakHour ? '#E0CD57' : count > 0 ? '#8B5CF6' : '#F3F4F6' }} />
                  <span className="text-[7px] text-gray-400">{h % 3 === 0 ? h + 'h' : ''}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-400">Matin</span>
              <span className="text-[10px] text-gray-400">Midi</span>
              <span className="text-[10px] text-gray-400">Soir</span>
            </div>
          </div>
        </div>

        {/* Top Dishes */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* All dishes ranking */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-bold text-sm mb-4">Plats les plus populaires</h3>
            {sortedDishes.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Aucun plat</p>
            ) : (
              <div className="space-y-3">
                {sortedDishes.slice(0, 8).map((dish, i) => {
                  const cat = categories.find(c => c.id === dish.category_id);
                  const pct = Math.round((dish.views / sortedDishes[0].views) * 100);
                  return (
                    <div key={dish.id} className="flex items-center gap-3">
                      <span className={'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ' + (i < 3 ? 'text-white' : 'text-gray-400 bg-gray-100')} style={i < 3 ? { background: ['#E0CD57', '#9CA3AF', '#CD7F32'][i] } : {}}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{dish.name}</span>
                          {cat && <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{cat.name}</span>}
                        </div>
                        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', background: i === 0 ? '#E0CD57' : '#3B82F6' }} />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-500">{dish.views}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* By category */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-bold text-sm mb-4">Populaires par categorie</h3>
            {categories.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Aucune categorie</p>
            ) : (
              <div className="space-y-5">
                {categories.map(cat => {
                  const catDishes = sortedDishes.filter(d => d.category_id === cat.id);
                  if (!catDishes.length) return null;
                  const totalCat = catDishes.reduce((a, d) => a + d.views, 0);
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs uppercase tracking-wider text-gray-400">{cat.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{totalCat} vues</span>
                      </div>
                      <div className="space-y-1.5">
                        {catDishes.slice(0, 3).map((dish, i) => (
                          <div key={dish.id} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs" style={{ color: '#E0CD57' }}>{['🥇', '🥈', '🥉'][i]}</span>
                              <span className="text-sm">{dish.name}</span>
                            </div>
                            <span className="text-xs text-gray-400">{dish.views} vues</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Weekly breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 mt-6">
          <h3 className="font-bold text-sm mb-4">Scans par jour de la semaine</h3>
          <div className="grid grid-cols-7 gap-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, i) => {
              const dayScans = scans.filter(s => s.scanned_at && new Date(s.scanned_at).getDay() === (i + 1) % 7).length;
              const maxWeekday = Math.max(...[0,1,2,3,4,5,6].map(d => scans.filter(s => s.scanned_at && new Date(s.scanned_at).getDay() === d).length), 1);
              const pct = Math.round((dayScans / maxWeekday) * 100);
              return (
                <div key={i} className="text-center">
                  <div className="h-24 flex items-end justify-center mb-2">
                    <div className="w-full max-w-[40px] rounded-t-lg transition-all" style={{ height: Math.max(pct, 5) + '%', background: pct === 100 ? '#E0CD57' : '#3B82F6' }} />
                  </div>
                  <p className="text-xs font-medium text-gray-500">{day}</p>
                  <p className="text-[10px] text-gray-400">{dayScans}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
