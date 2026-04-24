'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caracteres.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FAFAF8]">
        <div className="w-full max-w-md text-center">
          <img src="/logo.png" alt="Outam" className="h-20 w-auto mx-auto mb-6" />
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-display text-xl font-bold mb-2">Mot de passe modifie !</h2>
            <p className="text-gray-500 text-sm mb-6">Votre mot de passe a ete reinitialise avec succes.</p>
            <Link href="/dashboard" className="btn-primary inline-block w-full text-center">Acceder a mon dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FAFAF8]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Outam" className="h-20 w-auto mx-auto" />
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="font-display text-xl font-bold mb-2">Nouveau mot de passe</h2>
          <p className="text-gray-500 text-sm mb-6">Choisissez un nouveau mot de passe pour votre compte.</p>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Nouveau mot de passe *</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 caracteres" className="input-field pr-12" required minLength={6} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{showPwd ? 'Masquer' : 'Voir'}</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Confirmer *</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retapez le mot de passe" className={'input-field pr-12 ' + (confirmPassword && confirmPassword !== password ? 'border-red-400' : confirmPassword && confirmPassword === password ? 'border-green-400' : '')} required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{showConfirm ? 'Masquer' : 'Voir'}</button>
              </div>
              {confirmPassword && confirmPassword !== password && <p className="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas</p>}
              {confirmPassword && confirmPassword === password && <p className="text-green-500 text-xs mt-1">Les mots de passe correspondent</p>}
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
            <button type="submit" disabled={loading || (confirmPassword && confirmPassword !== password)} className="btn-primary w-full text-center disabled:opacity-50">
              {loading ? 'Modification...' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
