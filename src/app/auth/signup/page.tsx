'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const COLORS = ['#3300FF','#DC2626','#16A34A','#D97706','#7C3AED','#0284C7','#0F766E','#C026D3'];

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [themeColor, setThemeColor] = useState('#3300FF');
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const getLocation = () => {
    if (!navigator.geolocation) { alert('La geolocalisation n est pas supportee.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resp = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + pos.coords.latitude + '&lon=' + pos.coords.longitude + '&accept-language=fr');
          const data = await resp.json();
          setAddress((data.display_name || '').split(',').slice(0, 3).join(',').trim());
        } catch (e) { setAddress(pos.coords.latitude + ', ' + pos.coords.longitude); }
        setLocating(false);
      },
      () => { alert('Impossible d obtenir votre position.'); setLocating(false); }
    );
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caracteres.'); return; }
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }

    const slug = restaurantName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { error: restoError } = await supabase.from('restaurants').insert({
      owner_id: authData.user?.id, name: restaurantName, slug: slug + '-' + Date.now().toString(36).slice(-4),
      address: address.trim(), phone: phone.trim(), theme_color: themeColor,
    });
    if (restoError) { setError(restoError.message); setLoading(false); return; }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FAFAF8]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold text-gray-900"><Link href="/"><img src="/logo.png" alt="Outam" className="h-20 w-auto mx-auto cursor-pointer" /></Link></Link>
          <p className="text-gray-500 mt-2">Creez le menu digital de votre restaurant</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div style={{marginBottom:"16px"}}><Link href="/" style={{display:"inline-flex",alignItems:"center",gap:"6px",fontSize:"14px",color:"#9CA3AF"}}>← Retour</Link></div>
          <h2 className="font-display text-xl font-bold mb-6">Creer un compte</h2>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Nom du restaurant *</label>
              <input type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} placeholder="ex: Chez Fatou" className="input-field" required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className="input-field" required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Mot de passe *</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 caracteres" className="input-field pr-12" required minLength={6} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{showPwd ? 'Masquer' : 'Voir'}</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Confirmer le mot de passe *</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retapez le mot de passe" className={'input-field pr-12 ' + (confirmPassword && confirmPassword !== password ? 'border-red-400' : confirmPassword && confirmPassword === password ? 'border-green-400' : '')} required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">{showConfirm ? 'Masquer' : 'Voir'}</button>
              </div>
              {confirmPassword && confirmPassword !== password && <p className="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas</p>}
              {confirmPassword && confirmPassword === password && <p className="text-green-500 text-xs mt-1">Les mots de passe correspondent</p>}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Adresse du restaurant</label>
              <div className="flex gap-2">
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ex: Rue 10, Medina, Dakar" className="input-field flex-1" />
                <button type="button" onClick={getLocation} disabled={locating} className="btn-ghost text-xs flex-shrink-0 flex items-center gap-1 disabled:opacity-50">{locating ? '...' : 'Localiser'}</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Telephone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 000 00 00" className="input-field" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Couleur du menu</label>
              <div className="flex items-center gap-2">
                {COLORS.map((c) => <button key={c} type="button" onClick={() => setThemeColor(c)} className={'w-9 h-9 rounded-full border-2 transition-all ' + (themeColor === c ? 'border-gray-900 scale-110 shadow-md' : 'border-transparent hover:scale-105')} style={{ background: c }} />)}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
            <button type="submit" disabled={loading || (confirmPassword && confirmPassword !== password)} className="btn-primary w-full text-center disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creation en cours...' : 'Creer mon restaurant'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-6">Deja un compte ? <Link href="/auth/login" className="text-brand-500 font-medium hover:underline">Se connecter</Link></p>
        </div>
      </div>
    </div>
  );
}
