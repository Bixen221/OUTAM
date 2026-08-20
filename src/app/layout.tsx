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
        {children}
      </body>
    </html>
  );
}
