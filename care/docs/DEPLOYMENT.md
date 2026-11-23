# Firebase staging & controlled deployment

This is a **development foundation**, not a production-ready healthcare platform.

## Requirements

- Firebase project with Firestore, Firebase Auth Email/Password, Storage, Cloud Functions (Node.js 22), Hosting and App Check.
- Firebase CLI and trusted Google Cloud Application Default Credentials for the one-time bootstrap.
- Node 22; Firebase project billing plan supporting Functions; App Check reCAPTCHA v3 site key.

## Staging steps

1. Copy `.env.example` to `.env`, fill in **public** Firebase web config; do not add secrets.
2. Update `.firebaserc` with the dedicated Firebase project ID.
3. Run `npm ci` (when package lock is generated) or `npm install`, `npm test`, `npm run build`.
4. Run `cd functions && npm install && npm test && cd ..`.
5. Use `firebase emulators:exec` and role-specific Firestore/Storage security tests. This gate is **not passed** yet.
6. Deploy to **staging** only: `firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting`.
7. Create an Email/Password account in Firebase Authentication, verify its email and capture its UID. Provision it from a trusted terminal, **never from the frontend**:

```bash
cd functions
export COREBIQ_FIREBASE_PROJECT_ID="your-staging-project"
export COREBIQ_BOOTSTRAP_UID="verified-auth-user-uid"
export COREBIQ_BOOTSTRAP_EMAIL="admin@your-verified-domain.example"
export COREBIQ_BOOTSTRAP_CONFIRM="bootstrap:your-staging-project:verified-auth-user-uid"
# Authenticate using Google ADC outside source control.
npm run bootstrap:super-admin
```

8. Reload the login session to refresh the signed Firebase role claim.
9. Test role restrictions, cross-branch query denials, concurrent bookings, schedule rules and audit logs with nonclinical test records.
10. Review and enforce App Check for Hosting/Firestore and Functions; validate token issuance first. Never bypass App Check for production.

## Blockers

- No production deployment or live Firebase integration test has been performed.
- Booking overlapping intervals are locked, but branch hours, clinician hours, leave, holidays, buffers, cancellation and rescheduling still require validation.
- Clinical records, patient files, payment webhooks, refunds, PDF generation, WhatsApp templates and reporting need implementation.
- Never use real patient data until security, privacy, workflow, recovery and integration acceptance tests pass.
