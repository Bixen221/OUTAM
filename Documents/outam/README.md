# Outam — Menus digitaux pour restaurants au Sénégal

## Installation

```bash
# 1. Clone ou copie le dossier outam sur ton PC

# 2. Installe les dépendances
npm install

# 3. Lance le serveur de développement
npm run dev

# 4. Ouvre http://localhost:3000 dans ton navigateur
```

## Structure du projet

```
outam/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Page d'accueil (landing)
│   │   ├── layout.tsx         # Layout global
│   │   ├── globals.css        # Styles globaux + Tailwind
│   │   ├── auth/
│   │   │   ├── login/page.tsx # Connexion
│   │   │   └── signup/page.tsx # Inscription
│   │   ├── dashboard/
│   │   │   └── page.tsx       # Dashboard restaurant
│   │   └── menu/
│   │       └── [slug]/page.tsx # Menu public (ce que les clients voient)
│   └── lib/
│       └── supabase.ts        # Client Supabase
├── .env.local                 # Clés Supabase (NE PAS PARTAGER)
├── package.json
├── tailwind.config.js
└── next.config.js
```

## Déploiement sur Vercel

```bash
# 1. Pousse sur GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ton-pseudo/outam.git
git push -u origin main

# 2. Va sur vercel.com
# 3. Import ton repo GitHub
# 4. Ajoute les variables d'environnement :
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
# 5. Deploy !
```

## Technologies
- Next.js 14 (React)
- Supabase (Auth + PostgreSQL + Storage)
- Tailwind CSS
- QRCode.js
