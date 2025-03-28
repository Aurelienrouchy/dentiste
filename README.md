# Dentiste App - Transfert Audio Mobile-Ordinateur

Cette application permet d'enregistrer de l'audio sur un appareil mobile et de le transférer automatiquement vers un ordinateur via Firebase Storage.

## Comment ça fonctionne

1. **Sur l'ordinateur** :

   - L'application génère un QR code contenant un identifiant de session unique
   - Le QR code pointe vers une URL spécifique de l'application
   - L'ordinateur commence à vérifier périodiquement si un enregistrement audio est disponible

2. **Sur le mobile** :

   - L'utilisateur scanne le QR code, ce qui ouvre la page d'enregistrement
   - L'utilisateur enregistre l'audio
   - Après l'arrêt de l'enregistrement, l'audio est automatiquement téléchargé sur Firebase Storage

3. **Transfert automatique** :
   - Firebase Storage stocke temporairement l'enregistrement audio
   - L'ordinateur détecte que l'enregistrement est disponible et le télécharge
   - L'audio est alors prêt à être utilisé sur l'ordinateur

## Configuration Firebase

L'application utilise Firebase Storage pour le transfert des fichiers audio. Pour configurer votre propre projet Firebase :

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Activez Firebase Storage
3. Obtenez les clés d'API de votre projet
4. Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Avantages de cette approche

- **Fiabilité** : Utilise Firebase Storage, un service cloud robuste pour le transfert de données
- **Sécurité** : Les enregistrements sont stockés temporairement (24h maximum) et protégés par Firebase
- **Compatibilité** : Fonctionne sur tous les navigateurs mobiles modernes, y compris Safari iOS
- **Performances** : Les fichiers sont téléchargés et récupérés en arrière-plan, sans affecter l'expérience utilisateur

## Dépannage

Si vous rencontrez des problèmes :

1. **L'enregistrement ne démarre pas** : Vérifiez que le navigateur mobile a accès au microphone
2. **Le transfert échoue** : Vérifiez votre connexion internet et les paramètres Firebase
3. **Le QR code ne fonctionne pas** : Assurez-vous que l'URL générée est accessible depuis le mobile

## Maintenance

Les enregistrements audio sont automatiquement supprimés après 24 heures pour libérer de l'espace de stockage.
