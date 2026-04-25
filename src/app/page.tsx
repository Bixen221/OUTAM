'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [visible, setVisible] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoForm, setDemoForm] = useState({ name:'', address:'', phone:'', date:'', time:'' });
  const [demoSent, setDemoSent] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  function submitDemo(e) {
    e.preventDefault();
    const msg = encodeURIComponent('Bonjour, je souhaite une demo Outam.\n\nRestaurant: ' + demoForm.name + '\nAdresse: ' + demoForm.address + '\nTelephone: ' + demoForm.phone + '\nDate souhaitee: ' + demoForm.date + '\nHeure: ' + demoForm.time);
    window.open('https://wa.me/221766196090?text=' + msg, '_blank');
    setDemoSent(true);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .fade-up { animation: fadeUp 0.8s ease forwards; opacity: 0; }
        .fade-up-d1 { animation-delay: 0.1s; }
        .fade-up-d2 { animation-delay: 0.2s; }
        .fade-up-d3 { animation-delay: 0.3s; }
        .fade-up-d4 { animation-delay: 0.4s; }
        .fade-up-d5 { animation-delay: 0.5s; }
        .gold-text { color: #E0CD57; }
        .gold-bg { background: #E0CD57; }
        .brown-text { color: #4B1F12; }
        .gold-gradient { background: linear-gradient(135deg, #E0CD57 0%, #C4A94D 50%, #E0CD57 100%); background-size: 200% auto; animation: shimmer 3s linear infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .card-glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(10px); border: 1px solid rgba(224,205,87,0.1); }
        .card-glass:hover { background: rgba(255,255,255,0.06); border-color: rgba(224,205,87,0.3); }
        .btn-gold { background: linear-gradient(135deg, #E0CD57 0%, #C4A94D 100%); color: #0A0A0A; font-weight: 700; transition: all 0.3s; }
        .btn-gold:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(224,205,87,0.3); }
        .btn-outline { border: 1.5px solid rgba(224,205,87,0.4); color: #E0CD57; transition: all 0.3s; }
        .btn-outline:hover { background: rgba(224,205,87,0.1); border-color: #E0CD57; }
        .phone-mockup { background: linear-gradient(180deg, #1A1A1A 0%, #111 100%); border: 2px solid rgba(224,205,87,0.2); border-radius: 2rem; padding: 0.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(224,205,87,0.05); animation: float 4s ease-in-out infinite; }
        .phone-screen { background: linear-gradient(180deg, #4B1F12 0%, #2A1009 100%); border-radius: 1.5rem; overflow: hidden; }
        .glow-dot { width: 6px; height: 6px; background: #E0CD57; border-radius: 50%; box-shadow: 0 0 12px rgba(224,205,87,0.6); }
        .section-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(224,205,87,0.2), transparent); }
        .modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal-box { background: #111; border: 1px solid rgba(224,205,87,0.2); border-radius: 1.5rem; width: 100%; max-width: 480px; padding: 2rem; animation: fadeUp 0.3s ease; }
        .input-dark { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(224,205,87,0.15); border-radius: 0.75rem; padding: 0.75rem 1rem; color: #fff; font-family: 'Outfit', sans-serif; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
        .input-dark:focus { border-color: #E0CD57; }
        .input-dark::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 w-full z-50" style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(224,205,87,0.08)' }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/icon.png" alt="Outam" className="h-9 w-auto" />
            <span className="font-bold text-lg tracking-wide hidden sm:block" style={{ fontFamily: "'Playfair Display', serif" }}>OUT<span className="gold-text">AM</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-outline rounded-full px-5 py-2 text-sm">Connexion</Link>
            <Link href="/auth/signup" className="btn-gold rounded-full px-5 py-2 text-sm">Commencer</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(224,205,87,0.08) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-full h-32" style={{ background: 'linear-gradient(0deg, #0A0A0A, transparent)' }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 text-center md:text-left">
              <div className={`${visible ? 'fade-up fade-up-d1' : 'opacity-0'}`}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: 'rgba(224,205,87,0.08)', border: '1px solid rgba(224,205,87,0.15)' }}>
                  <div className="glow-dot" />
                  <span className="text-xs gold-text font-medium tracking-wider uppercase">Gratuit pour toujours</span>
                </div>
              </div>
              <h1 className={`text-4xl md:text-6xl font-bold leading-[1.1] mb-5 ${visible ? 'fade-up fade-up-d2' : 'opacity-0'}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                Le menu digital<br />
                <span className="gold-gradient">premium</span> pour<br />
                votre restaurant
              </h1>
              <p className={`text-gray-400 text-lg md:text-xl max-w-lg mb-8 leading-relaxed ${visible ? 'fade-up fade-up-d3' : 'opacity-0'}`}>
                Creez un menu elegant, partagez-le via QR code. Vos clients scannent et decouvrent vos plats instantanement.
              </p>
              <div className={`flex flex-col sm:flex-row gap-3 justify-center md:justify-start ${visible ? 'fade-up fade-up-d4' : 'opacity-0'}`}>
                <Link href="/auth/signup" className="btn-gold rounded-full px-8 py-4 text-base text-center">
                  Creer mon menu gratuitement
                </Link>
                <button onClick={() => setShowDemo(true)} className="btn-outline rounded-full px-6 py-4 text-sm text-center flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                  Demander une demo
                </button>
              </div>
            </div>
            <div className={`flex-shrink-0 ${visible ? 'fade-up fade-up-d5' : 'opacity-0'}`}>
              <div className="phone-mockup w-[260px] md:w-[280px]">
                <div className="phone-screen">
                  <div className="p-4 text-center" style={{ background: 'linear-gradient(180deg, #4B1F12 0%, #3A150C 100%)' }}>
                    <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'rgba(224,205,87,0.15)', border: '1px solid rgba(224,205,87,0.3)' }}>
                      <span className="gold-text font-bold text-sm">CF</span>
                    </div>
                    <p className="font-bold text-sm text-white">Chez Fatou</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Medina, Dakar</p>
                  </div>
                  <div className="bg-[#0F0F0F] p-3 space-y-2">
                    <div className="flex gap-1.5 mb-3">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-medium gold-bg brown-text">Tout</span>
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>Plats</span>
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>Boissons</span>
                    </div>
                    {[
                      { name: 'Thieboudienne', price: '3 500 F', emoji: '🍛' },
                      { name: 'Yassa Poulet', price: '3 000 F', emoji: '🍗' },
                      { name: 'Bissap Frais', price: '500 F', emoji: '🥤' },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(224,205,87,0.08)' }}>{d.emoji}</div>
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-white">{d.name}</p>
                          <p className="text-[10px] gold-text font-bold mt-0.5">{d.price}</p>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2"><p className="text-[8px] text-white/20">Menu cree avec Outam</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-line max-w-4xl mx-auto" />

      {/* How it works */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <p className="text-xs gold-text font-semibold tracking-[0.2em] uppercase mb-3">Simple et rapide</p>
            <h2 className="text-3xl md:text-5xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Comment ca <span className="gold-gradient">marche</span> ?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Creez votre compte', desc: 'Inscrivez-vous gratuitement. Ajoutez le nom et le logo de votre restaurant.', icon: '✦' },
              { step: '02', title: 'Ajoutez vos plats', desc: 'Categories, plats, prix, photos. Gerez les promotions et la disponibilite.', icon: '◈' },
              { step: '03', title: 'Partagez le QR code', desc: 'Telechargez votre QR code, imprimez-le. Vos clients scannent et voient le menu.', icon: '◎' },
            ].map((f) => (
              <div key={f.step} className="card-glass rounded-2xl p-8 text-center transition-all duration-300">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5" style={{ background: 'rgba(224,205,87,0.1)', border: '1px solid rgba(224,205,87,0.2)' }}>
                  <span className="gold-text text-xl">{f.icon}</span>
                </div>
                <div className="gold-text text-xs font-bold tracking-[0.15em] uppercase mb-3">{f.step}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-line max-w-4xl mx-auto" />

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <p className="text-xs gold-text font-semibold tracking-[0.2em] uppercase mb-3">Fonctionnalites</p>
            <h2 className="text-3xl md:text-5xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Tout ce qu il <span className="gold-gradient">vous faut</span></h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { title: '100% Gratuit', desc: 'Pas d abonnement, pas de frais caches. Votre menu digital est gratuit pour toujours.', icon: '💎' },
              { title: 'QR Code integre', desc: 'Generez et telechargez votre QR code en un clic. Imprimez-le pour vos tables.', icon: '📱' },
              { title: 'Promotions', desc: 'Appliquez des promotions sur vos plats avec date d expiration. Attirez plus de clients.', icon: '🏷️' },
              { title: 'Statistiques', desc: 'Suivez le nombre de scans de votre menu. Mesurez l impact de votre QR code.', icon: '📊' },
              { title: 'Mobile-first', desc: 'Optimise pour les telephones. Un beau menu meme avec une connexion lente.', icon: '⚡' },
              { title: 'Adapte au Senegal', desc: 'Prix en FCFA, categories locales, interface en francais. Fait pour vous.', icon: '🇸🇳' },
            ].map((b, i) => (
              <div key={i} className="card-glass rounded-2xl p-6 flex gap-4 transition-all duration-300">
                <div className="text-2xl flex-shrink-0 mt-1">{b.icon}</div>
                <div><h3 className="font-bold text-base mb-1">{b.title}</h3><p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-line max-w-4xl mx-auto" />

      {/* Testimonials */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p className="text-xs gold-text font-semibold tracking-[0.2em] uppercase mb-3">Ils nous font confiance</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-12" style={{ fontFamily: "'Playfair Display', serif" }}>Les restaurants <span className="gold-gradient">senegalais</span> adoptent Outam</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Chez Fatou', loc: 'Medina, Dakar', quote: 'Mes clients adorent scanner le QR code. Plus besoin de menus papier.' },
              { name: 'Le Djolof', loc: 'Almadies, Dakar', quote: 'En 5 minutes mon menu etait en ligne. Simple et elegant.' },
              { name: 'Teranga Cafe', loc: 'Plateau, Dakar', quote: 'Les promotions m aident a attirer plus de clients le midi.' },
            ].map((t, i) => (
              <div key={i} className="card-glass rounded-2xl p-6 text-left transition-all duration-300">
                <div className="flex items-center gap-1 mb-4">{[1,2,3,4,5].map(s => <span key={s} className="gold-text text-sm">★</span>)}</div>
                <p className="text-gray-400 text-sm leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold gold-bg brown-text">{t.name[0]}</div>
                  <div><p className="font-semibold text-sm">{t.name}</p><p className="text-gray-500 text-xs">{t.loc}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-line max-w-4xl mx-auto" />

      {/* CTA */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(224,205,87,0.06) 0%, transparent 70%)' }} /></div>
        <div className="relative max-w-3xl mx-auto px-5 text-center">
          <img src="/icon.png" alt="Outam" className="h-16 w-auto mx-auto mb-6" style={{ filter: 'drop-shadow(0 0 20px rgba(224,205,87,0.3))' }} />
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Pret a <span className="gold-gradient">digitaliser</span><br />votre menu ?</h2>
          <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">Rejoignez les restaurants senegalais qui utilisent Outam. C est gratuit, pour toujours.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup" className="btn-gold rounded-full px-10 py-4 text-base inline-block text-center">Commencer maintenant</Link>
            <button onClick={() => setShowDemo(true)} className="btn-outline rounded-full px-8 py-4 text-sm text-center">Demander une demo</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(224,205,87,0.08)' }}>
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Outam" className="h-8 w-auto" />
            <span className="font-bold tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>OUT<span className="gold-text">AM</span></span>
            <span className="text-gray-600 text-sm ml-2">Menus digitaux pour restaurants</span>
          </div>
          <p className="text-gray-600 text-xs">Fait par Babacar &middot; 2026</p>
        </div>
      </footer>

      {/* Demo Modal */}
      {showDemo && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDemo(false); }}>
          <div className="modal-box">
            {demoSent ? (
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="font-bold text-xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Demande envoyee !</h3>
                <p className="text-gray-400 text-sm mb-6">Nous vous contacterons pour planifier votre demo. Merci de votre interet pour Outam.</p>
                <button onClick={() => { setShowDemo(false); setDemoSent(false); setDemoForm({ name:'', address:'', phone:'', date:'', time:'' }); }} className="btn-gold rounded-full px-8 py-3 text-sm">Fermer</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>Demander une <span className="gold-text">demo</span></h3>
                    <p className="text-gray-500 text-xs mt-1">Remplissez ce formulaire et nous vous contacterons</p>
                  </div>
                  <button onClick={() => setShowDemo(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white" style={{ background: 'rgba(255,255,255,0.05)' }}>&times;</button>
                </div>
                <form onSubmit={submitDemo} className="space-y-4">
                  <div>
                    <label className="text-xs gold-text font-semibold tracking-wider uppercase block mb-1.5">Nom du restaurant / hotel *</label>
                    <input type="text" value={demoForm.name} onChange={(e) => setDemoForm({...demoForm, name: e.target.value})} placeholder="ex: Chez Fatou" className="input-dark" required />
                  </div>
                  <div>
                    <label className="text-xs gold-text font-semibold tracking-wider uppercase block mb-1.5">Adresse *</label>
                    <input type="text" value={demoForm.address} onChange={(e) => setDemoForm({...demoForm, address: e.target.value})} placeholder="ex: Rue 10, Medina, Dakar" className="input-dark" required />
                  </div>
                  <div>
                    <label className="text-xs gold-text font-semibold tracking-wider uppercase block mb-1.5">Numero de telephone *</label>
                    <input type="tel" value={demoForm.phone} onChange={(e) => setDemoForm({...demoForm, phone: e.target.value})} placeholder="+221 77 000 00 00" className="input-dark" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs gold-text font-semibold tracking-wider uppercase block mb-1.5">Jour souhaite *</label>
                      <input type="date" value={demoForm.date} onChange={(e) => setDemoForm({...demoForm, date: e.target.value})} className="input-dark" required />
                    </div>
                    <div>
                      <label className="text-xs gold-text font-semibold tracking-wider uppercase block mb-1.5">Heure *</label>
                      <input type="time" value={demoForm.time} onChange={(e) => setDemoForm({...demoForm, time: e.target.value})} className="input-dark" required />
                    </div>
                  </div>
                  <button type="submit" className="btn-gold rounded-full px-8 py-3 text-sm w-full mt-2">Envoyer ma demande</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
