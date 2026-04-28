'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminAnalytics() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [scans, setScans] = useState([]);
  const [period, setPeriod] = useState('7');
  const router = useRouter();

  useEffect(() => { checkAdmin(); }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }
    const { data: admin } = await supabase.from('admins').select('*').eq('user_id', user.id).single();
    if (!admin) { router.push('/dashboard'); return; }
    setIsAdmin(true);
    const { data: r } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    setRestaurants(r || []);
    const { data: d } = await supabase.from('dishes').select('*');
    setDishes(d || []);
    const { data: s } = await supabase.from('menu_scans').select('*').order('scanned_at', { ascending: false });
    setScans(s || []);
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 bg-white">Verification admin...</div>;
  if (!isAdmin) return null;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const scansToday = scans.filter(s => s.scanned_at >= today).length;
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const scansWeek = scans.filter(s => s.scanned_at >= weekAgo).length;
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const scansMonth = scans.filter(s => s.scanned_at >= monthAgo).length;

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

  const hourlyData = Array(24).fill(0);
  scans.forEach(s => { if (s.scanned_at) { hourlyData[new Date(s.scanned_at).getHours()]++; } });
  const maxHourly = Math.max(...hourlyData, 1);
  const peakHour = hourlyData.indexOf(Math.max(...hourlyData));

  // Top restaurants by scans
  const restoScans = restaurants.map(r => ({
    ...r,
    totalScans: scans.filter(s => s.restaurant_id === r.id).length,
    todayScans: scans.filter(s => s.restaurant_id === r.id && s.scanned_at >= today).length,
    dishCount: dishes.filter(d => d.restaurant_id === r.id).length,
  })).sort((a, b) => b.totalScans - a.totalScans);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/icon.png" alt="Outam" className="h-9 w-auto" />
            </Link>
            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">ADMIN</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
            <Link href="/admin" className="px-4 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white transition-colors">Restaurants</Link>
            <Link href="/admin/analytics" className="px-4 py-1.5 rounded-full text-xs font-medium bg-white text-gray-900 shadow-sm">Analytics</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Analytics globales</h1>
            <p className="text-gray-400 text-sm mt-0.5">Statistiques de toute la plateforme Outam</p>
          </div>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none">
            <option value="7">7 jours</option>
            <option value="14">14 jours</option>
            <option value="30">30 jours</option>
            <option value="90">3 mois</option>
          </select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Restaurants</p>
            <p className="text-3xl font-bold mt-1 text-gray-900">{restaurants.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Aujourd hui</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#E0CD57' }}>{scansToday}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Semaine</p>
            <p className="text-3xl font-bold mt-1 text-blue-500">{scansWeek}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Mois</p>
            <p className="text-3xl font-bold mt-1 text-purple-500">{scansMonth}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total</p>
            <p className="text-3xl font-bold mt-1 text-green-500">{scans.length}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-bold text-sm mb-4">Scans par jour (toute la plateforme)</h3>
            <div className="flex items-end gap-1 h-40">
              {dailyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400 font-medium">{d.count > 0 ? d.count : ''}</span>
                  <div className="w-full rounded-t-md transition-all" style={{ height: Math.max((d.count / maxDaily) * 120, 4) + 'px', background: d.key === today ? '#E0CD57' : d.count > 0 ? '#3B82F6' : '#F3F4F6' }} />
                  <span className="text-[8px] text-gray-400">{days <= 14 ? d.label : (i % Math.ceil(days/10) === 0 ? d.label : '')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Heures de pointe</h3>
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: '#FEF3C7', color: '#92400E' }}>Pic: {peakHour}h</span>
            </div>
            <div className="flex items-end gap-[3px] h-40">
              {hourlyData.map((count, h) => (
                <div key={h} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm" style={{ height: Math.max((count / maxHourly) * 120, 2) + 'px', background: h === peakHour ? '#E0CD57' : count > 0 ? '#8B5CF6' : '#F3F4F6' }} />
                  <span className="text-[7px] text-gray-400">{h % 3 === 0 ? h + 'h' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top restaurants */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h3 className="font-bold text-sm mb-4">Classement des restaurants par scans</h3>
          <div className="space-y-3">
            {restoScans.map((r, i) => {
              const pct = restoScans[0]?.totalScans > 0 ? Math.round((r.totalScans / restoScans[0].totalScans) * 100) : 0;
              return (
                <div key={r.id} className="flex items-center gap-3">
                  <span className={'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ' + (i < 3 ? 'text-white' : 'text-gray-400 bg-gray-100')} style={i < 3 ? { background: ['#E0CD57', '#9CA3AF', '#CD7F32'][i] } : {}}>
                    {i + 1}
                  </span>
                  {r.logo_url ? <img src={r.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: (r.theme_color || '#3300FF') + '15', color: r.theme_color || '#3300FF' }}>{r.name[0]}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{r.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{r.dishCount} plats</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: pct + '%', background: i === 0 ? '#E0CD57' : '#3B82F6' }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-semibold">{r.totalScans}</span>
                    {r.todayScans > 0 && <span className="text-[10px] text-amber-500 block">+{r.todayScans} auj.</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
// fix

