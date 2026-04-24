'use client';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold text-gray-900">
            <img src="/icon.png" alt="Outam" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-ghost text-sm">Connexion</Link>
            <Link href="/auth/signup" className="btn-primary text-sm">Créer mon menu</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-transparent to-amber-500/10" />
        <div className="relative max-w-4xl mx-auto px-5 py-20 md:py-28 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-4">
            Votre menu digital<br />
            <span className="text-amber-400 italic">en 5 minutes</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto mb-8">
            Créez le menu de votre restaurant, partagez-le via QR code.
            Gratuit, simple et adapté au Sénégal.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup" className="btn-primary text-base px-8 py-4">
              Créer mon menu gratuitement
            </Link>
            <Link href="/menu/demo" className="text-gray-400 hover:text-white transition-colors text-sm underline underline-offset-4">
              Voir un menu démo →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Comment ça marche ?</h2>
          <p className="text-gray-500 text-lg">3 étapes simples pour digitaliser votre menu</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Créez votre compte', desc: 'Inscrivez-vous gratuitement avec votre email. Ajoutez le nom et le logo de votre restaurant.', icon: '📝' },
            { step: '2', title: 'Ajoutez vos plats', desc: 'Créez des catégories (entrées, plats, boissons...) et ajoutez vos plats avec photos et prix.', icon: '🍽️' },
            { step: '3', title: 'Partagez votre QR code', desc: 'Téléchargez votre QR code, imprimez-le et posez-le sur vos tables. Vos clients scannent et voient le menu.', icon: '📱' },
          ].map((f) => (
            <div key={f.step} className="bg-white rounded-2xl p-8 border border-gray-100 text-center hover:border-brand-500 hover:shadow-lg transition-all">
              <div className="text-4xl mb-4">{f.icon}</div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-500 text-sm font-bold mb-3">{f.step}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-gray-900 text-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Pourquoi Outam ?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: '100% gratuit', desc: 'Pas d\'abonnement, pas de frais cachés. Votre menu digital est gratuit pour toujours.' },
              { title: 'Simple à utiliser', desc: 'Pas besoin de compétences techniques. Si vous savez envoyer un WhatsApp, vous pouvez utiliser Outam.' },
              { title: 'Mobile-first', desc: 'Optimisé pour les téléphones. Vos clients voient un beau menu même avec une connexion lente.' },
              { title: 'QR Code inclus', desc: 'Générez et téléchargez votre QR code en un clic. Imprimez-le et posez-le sur vos tables.' },
              { title: 'Mises à jour instantanées', desc: 'Un plat n\'est plus disponible ? Désactivez-le en un tap. Le menu se met à jour en temps réel.' },
              { title: 'Adapté au Sénégal', desc: 'Prix en FCFA, catégories locales (Thiéboudienne, Yassa...), interface en français.' },
            ].map((b, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">{b.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-5 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Prêt à digitaliser votre menu ?</h2>
        <p className="text-gray-500 mb-8">Rejoignez les restaurants sénégalais qui utilisent Outam</p>
        <Link href="/auth/signup" className="btn-primary text-base px-8 py-4">
          Commencer maintenant — C&apos;est gratuit
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-500 py-8 text-center text-sm">
        <p>Outam — Menus digitaux pour restaurants au Sénégal</p>
        <p className="mt-1 text-xs">Fait par Babacar · 2026</p>
      </footer>
    </div>
  );
}
