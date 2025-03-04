# Dentiste - Dashboard pour Cabinet Dentaire

Une application de gestion pour cabinet dentaire avec authentification par email et un tableau de bord complet.

## Technologies utilisées

- React 19
- TypeScript
- Vite
- TanStack Router pour la navigation
- TanStack Query pour la gestion des données
- Firebase pour l'authentification et la base de données
- Shadcn UI pour les composants d'interface
- Tailwind CSS pour le styling

## Fonctionnalités

- Authentification par email
- Tableau de bord avec statistiques
- Gestion des documents
- Gestion des patients
- Gestion des contacts professionnels

## Installation

1. Clonez ce dépôt
2. Installez les dépendances avec `npm install`
3. Créez un projet Firebase et configurez les variables d'environnement
4. Copiez le fichier `.env.example` en `.env.local` et remplissez les variables Firebase
5. Lancez l'application en développement avec `npm run dev`

## Configuration Firebase

Pour configurer Firebase, vous devez créer un projet sur la [console Firebase](https://console.firebase.google.com/) et activer:

- Authentication (Email/Password)
- Firestore Database
- Storage

Ensuite, ajoutez les variables d'environnement dans votre fichier `.env.local`:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Structure du projet

```
src/
  ├── components/       # Composants React
  │   ├── auth/         # Composants d'authentification
  │   ├── dashboard/    # Composants du tableau de bord
  │   ├── layout/       # Composants de mise en page
  │   └── ui/           # Composants UI réutilisables (shadcn)
  ├── hooks/            # Hooks personnalisés
  ├── lib/              # Bibliothèques et configurations
  │   └── firebase/     # Configuration Firebase
  ├── routes/           # Pages et configuration des routes
  └── index.css         # Styles globaux
```

## Scripts disponibles

- `npm run dev` - Lance l'application en mode développement
- `npm run build` - Compile l'application pour la production
- `npm run lint` - Vérifie le code avec ESLint
- `npm run preview` - Prévisualise la version de production localement
