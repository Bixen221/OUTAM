'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Create restaurant
    const slug = restaurantName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { error: restoError } = await supabase.from('restaurants').insert({
      owner_id: authData.user?.id,
      name: restaurantName,
      slug: slug + '-' + Date.now().toString(36).slice(-4),
    });

    if (restoError) {
      setError(restoError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FAFAF8]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold text-gray-900">
            Ou<span className="text-brand-500">tam</span>
          </Link>
          <p className="text-gray-500 mt-2">Créez le menu digital de votre restaurant</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="font-display text-xl font-bold mb-6">Créer un compte</h2>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
                Nom du restaurant *
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="ex: Chez Fatou"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
                Mot de passe *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="input-field"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création en cours...' : 'Créer mon restaurant'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-brand-500 font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
