'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError('Email ou mot de passe incorrect.'); setLoading(false); return; }
    router.push('/dashboard');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) { setError('Entrez votre email.'); return; }
    setResetLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: window.location.origin + '/auth/reset' });
    if (error) { setError(error.message); setResetLoading(false); return; }
    setResetSent(true);
    setResetLoading(false);
  };

  if (resetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FAFAF8]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8"><Link href="/" className="font-display text-3xl font-bold text-gray-900"><Link href="/"><img src="/logo.png" alt="Outam" className="h-20 w-auto mx-auto cursor-pointer" /></Link></Link></div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            {resetSent ? (
              <div className="text-center">
                <div className="text-4xl mb-4">📧</div>
                <h2 className="font-display text-xl font-bold mb-2">Email envoye !</h2>
                <p className="text-gray-500 text-sm mb-6">Un lien de reinitialisation a ete envoye a <strong>{resetEmail}</strong>. Verifiez votre boite mail et les spams.</p>
                <button onClick={() => { setResetMode(false); setResetSent(false); }} className="btn-primary w-full">Retour a la connexion</button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold mb-2">Mot de passe oublie ?</h2>
                <p className="text-gray-500 text-sm mb-6">Entrez votre email pour recevoir un lien de reinitialisation.</p>
                <form onSubmit={handleReset} className="space-y-4">
                  <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Email</label><input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="votre@email.com" className="input-field" required /></div>
                  {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
                  <button type="submit" disabled={resetLoading} className="btn-primary w-full text-center disabled:opacity-50">{resetLoading ? 'Envoi...' : 'Envoyer le lien'}</button>
                </form>
                <button onClick={() => { setResetMode(false); setError(''); }} className="text-sm text-brand-500 font-medium hover:underline mt-4 block text-center w-full">Retour a la connexion</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FAFAF8]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold text-gray-900"><Link href="/"><img src="/logo.png" alt="Outam" className="h-20 w-auto mx-auto cursor-pointer" /></Link></Link>
          <p className="text-gray-500 mt-2">Connectez-vous a votre restaurant</p>
        </div>
        <Link href="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"><span>←</span> Retour a l accueil</Link>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="mb-4"><Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">← Retour</Link></div>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"><span>←</span> Retour a l accueil</Link>
          <h2 className="font-display text-xl font-bold mb-6">Connexion</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className="input-field" required /></div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Mot de passe</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" className="input-field pr-12" required />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{showPwd ? 'Masquer' : 'Voir'}</button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full text-center disabled:opacity-50">{loading ? 'Connexion...' : 'Se connecter'}</button>
          </form>
          <button onClick={() => { setResetMode(true); setResetEmail(email); setError(''); }} className="text-sm text-brand-500 font-medium hover:underline mt-4 block text-center w-full">Mot de passe oublie ?</button>
          <p className="text-center text-sm text-gray-400 mt-4">Pas encore de compte ? <Link href="/auth/signup" className="text-brand-500 font-medium hover:underline">Creer un restaurant</Link></p>
        </div>
      </div>
    </div>
  );
}
