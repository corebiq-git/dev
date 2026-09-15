# CorBIQ ERP & CRM

Responsive PWA with separate module pages, Firebase Auth/Firestore/Storage hooks and a Gemini AI backend.

## Deploy
1. Create a Firebase project and Web App.
2. Copy `.firebaserc.example` to `.firebaserc` and replace the project ID.
3. Put your Firebase Web App config in `firebase-config.js`.
4. Enable Anonymous Authentication (or replace with your preferred sign-in).
5. Enable Firestore and Storage.
6. For AI: install Firebase CLI, then from the `functions` folder run `npm install`.
7. Set the Gemini key as a Firebase secret:
   `firebase functions:secrets:set GEMINI_API_KEY`
8. Deploy:
   `firebase deploy`
9. For production security, configure Firestore/Storage rules and Firebase App Check.

IMPORTANT:
- Never put a Gemini API key in HTML/JS.
- `firebase-config.js` contains public web-app configuration, not a Gemini secret.
- The Gemini key is read only by the server-side Firebase Function.
