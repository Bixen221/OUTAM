'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function MenuPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDish, setSelectedDish] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { loadMenu(); }, [slug]);

  async function loadMenu() {
    const { data: resto } = await supabase.from('restaurants').select('*').eq('slug', slug).single();
    if (!resto) { setNotFound(true); setLoading(false); return; }
    setRestaurant(resto);

    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', resto.id).eq('is_active', true).order('sort_order');
    setCategories(cats || []);

    const { data: d } = await supabase.from('dishes').select('*').eq('restaurant_id', resto.id).eq('is_available', true).order('sort_order');
    setDishes(d || []);
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 bg-[#FAFAF8]"><div className="text-center"><div className="text-3xl mb-2">🍽️</div>Chargement du menu...</div></div>;
  if (notFound) return <div className="min-h-screen flex items-center justify-center text-gray-400 bg-[#FAFAF8]"><div className="text-center"><div className="text-3xl mb-2">😕</div><p className="font-bold text-lg text-gray-600">Restaurant introuvable</p><p className="text-sm mt-1">Vérifiez le lien ou le QR code</p></div></div>;

  const color = restaurant?.theme_color || '#3300FF';

  const filteredDishes = dishes.filter(d => {
    if (activeCategory && d.category_id !== activeCategory) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groupedDishes: Record<number, any[]> = {};
  filteredDishes.forEach(d => {
    if (!groupedDishes[d.category_id]) groupedDishes[d.category_id] = [];
    groupedDishes[d.category_id].push(d);
  });

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Restaurant Header */}
      <div className="text-white py-8 px-5 text-center relative overflow-hidden" style={{ background: color }}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          {restaurant?.logo_url && (
            <img src={restaurant.logo_url} alt={restaurant.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 border-2 border-white/30 object-cover" />
          )}
          <h1 className="font-display text-2xl md:text-3xl font-bold">{restaurant?.name}</h1>
          {restaurant?.description && <p className="text-white/70 text-sm mt-1 max-w-md mx-auto">{restaurant.description}</p>}
          {restaurant?.address && <p className="text-white/50 text-xs mt-2">📍 {restaurant.address}</p>}
          {restaurant?.phone && <p className="text-white/50 text-xs mt-1">📞 {restaurant.phone}</p>}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-lg mx-auto px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plat..."
            className="flex-1 px-4 py-2 outline-none text-sm bg-transparent"
          />
          {search && <button onClick={() => setSearch('')} className="text-gray-400 px-3 text-sm">✕</button>}
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${!activeCategory ? 'text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
              style={!activeCategory ? { background: color } : {}}
            >
              Tout
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat.id ? 'text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                style={activeCategory === cat.id ? { background: color } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dishes */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {Object.keys(groupedDishes).length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-2xl mb-2">🔍</p>
            <p>Aucun plat trouvé</p>
          </div>
        ) : (
          categories.filter(c => groupedDishes[c.id]?.length).map((cat) => (
            <div key={cat.id} className="mb-6">
              <h2 className="font-display text-lg font-bold mb-3 pl-1" style={{ color }}>{cat.name}</h2>
              <div className="space-y-2.5">
                {groupedDishes[cat.id].map((dish: any) => (
                  <div
                    key={dish.id}
                    onClick={() => setSelectedDish(dish)}
                    className="bg-white rounded-2xl p-4 flex items-center gap-3.5 border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    {dish.image_url ? (
                      <img src={dish.image_url} alt={dish.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: color + '10' }}>
                        🍽️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[15px] leading-tight">{dish.name}</h3>
                      {dish.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{dish.description}</p>}
                      <p className="font-bold mt-1.5 text-[15px]" style={{ color }}>{dish.price.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dish detail modal */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setSelectedDish(null)}>
          <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {selectedDish.image_url && (
              <img src={selectedDish.image_url} alt={selectedDish.name} className="w-full h-56 object-cover rounded-t-3xl md:rounded-t-3xl" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-display text-xl font-bold leading-tight flex-1">{selectedDish.name}</h2>
                <button onClick={() => setSelectedDish(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 ml-3">×</button>
              </div>
              <p className="text-2xl font-bold mb-4" style={{ color }}>{selectedDish.price.toLocaleString()} FCFA</p>
              {selectedDish.description && <p className="text-gray-500 text-sm leading-relaxed">{selectedDish.description}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Powered by */}
      <div className="text-center py-6 text-xs text-gray-300">
        Menu créé avec <a href="/" className="text-brand-500 hover:underline font-medium">Outam</a>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
