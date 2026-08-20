import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Outam — Menus digitaux pour restaurants au Sénégal',
  description: 'Créez et partagez le menu digital de votre restaurant gratuitement. QR code, mobile-first, simple et moderne.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <div style={{background:'#1A1917',padding:'6px 16px',display:'flex',alignItems:'center',justifyContent:'center',gap:12,fontSize:11,color:'rgba(255,255,255,0.6)',fontFamily:"'Inter',sans-serif"}}><span>Besoin d aide ?</span><a href="mailto:senecop95@gmail.com" style={{color:'#E0CD57',textDecoration:'none',fontWeight:500}}>senecop95@gmail.com</a><span style={{color:'rgba(255,255,255,0.2)'}}>|</span><a href="https://wa.me/221766196090" target="_blank" style={{color:'#25D366',textDecoration:'none',fontWeight:500}}>WhatsApp</a></div>{children}
      </body>
    </html>
  );
}
