# Controlled Firebase deployment

1. Create a dedicated Firebase project and enable Firestore, Authentication (Email/Password), Storage, App Check and Functions on the required billing plan.
2. Copy `.env.example` to `.env`; populate only PUBLIC Firebase web config values and an App Check reCAPTCHA v3 site key. Never add payment or WhatsApp tokens to the frontend.
3. Update `.firebaserc` with your Firebase project ID.
4. `npm install && npm run build`; `cd functions && npm install && npm test && cd ..`.
5. Install Firebase CLI, authenticate, then `firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting`.
6. Create initial Firebase Auth super admin account manually, and set custom claim `{role:'super_admin'}` plus Firestore `users/{uid}` document `{role:'super_admin',status:'active',branchIds:[]}` via a trusted Admin SDK or controlled bootstrap script (not the browser).
7. Configure App Check enforcement on Firebase services only after validating token issuance. Enforce testing/staging first.
8. Run Firebase Emulator Suite security tests and integration tests before any production/patient-data rollout.

**Never launch this foundation with real health data or enable public booking yet.** No payment or messaging secrets have been supplied or installed.
