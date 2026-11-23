# COREBIQ Care — Phase 1 Foundation (development build)

**Status:** Source builds locally; not approved for real-patient production use. This is not the full 7-phase application. No fake billing, WhatsApp delivery, clinical reports or payments.

## Included
- Material-inspired responsive sign-in and authorized navigation (blue/green, light/dark)
- Firebase email/password auth; server-provisioned user roles; deny-by-default Firestore and Storage rules
- Authorized live listing and server-side creation for branches, staff, patients and services
- Transactional business ID service (20 module prefixes)
- Early staff appointment booking endpoint with atomic staff-and-patient interval occupancy locks (hours, leave, holidays and cancellation still pending)
- Cloud Function audit writes; PWA manifest/service worker shell; emulator-independent unit tests
- Deployment instructions, Firestore data model, explicit pending checklist

## Commands
```
cp .env.example .env
npm install
npm test
npm run build
cd functions && npm install && npm test
```

See `docs/DEPLOYMENT.md` and `docs/SCHEMA.md`.

## SECURITY BLOCKERS for real deployment
1. Booking now prevents overlapping slots using five-minute locks, but must still validate branch/staff hours, holidays, leave, buffers and capacity. Cancellation must release locks safely.
2. Clinical records need treatment-assignment and purpose-based access (current patient list visibility is only branch-level). Restricted data should be separated from reception fields.
3. Public guest booking requires verified anti-abuse and identity checks, with a public callable and explicit consent.
4. Staff cross-branch allocation and query-side branch filtering need completion; current staff form handles one branch.
5. Firebase security rules must be emulator-tested with each role, and policies reviewed against local health-data regulations.
6. Implement payments, invoices, PDFs, WhatsApp consent/templates/webhooks, reporting and admin provisioning UI in later phases.
7. Use staging deployment and actual API integration testing before production release.
