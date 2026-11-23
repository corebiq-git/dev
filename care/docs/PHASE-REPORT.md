# Phase 1 delivery report

Created: Vite frontend, Firebase configuration, shared UI, login, core module list/create controls, Cloud Functions for record creation, IDs, role assignment and initial booking, default-deny rules, PWA shell, documentation and unit tests.
Modified in existing repository: none. ZIP is a separate project.
Firebase changes deployed: none; separate Firebase project/config needed.
Security: App Check on functions, active user check, role and branch validation, Firestore/Storage default deny. No browser-managed user roles or payment statuses.
Testing: see locally executed commands in conversation; Firebase integration, security emulator, payment, WhatsApp and real deployment are NOT tested.
Pending: Phases 2–7, plus Phase 1 security hardening and acceptance tests. The included appointment endpoint is not production safe for scheduling overlaps; refer to README.

### Follow-up hardening (2026-11-23)
- Added five-minute staff and patient occupancy locking in booking transactions.
- Restricted Firestore client queries to authorized branches; removed bulk physiotherapist patient list.
- Required signed custom role claim to match protected user profile.
- Added appointment lock unit tests and composite indexes.
- Firebase integration, concurrency and deployment remain untested; production use blocked.
