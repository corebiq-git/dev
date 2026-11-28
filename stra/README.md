# COREBIQ | CARE — Revised Auth Starter

Authentication is separate at `auth/signin.html`.

User profile:
`users/{Firebase UID}`

Expected fields:
- uid
- email
- name
- role: `admin` or `user`
- companyId
- branchId
- branchName
- status: `active` / `inactive`

Admin:
- Full access within the assigned company.

Staff/User:
- Access only to records with the same companyId and branchId.

IMPORTANT:
Firestore Security Rules are the real security boundary. Client-side checks are only for UI/routing.
Edit `js/firebase-config.js` with your Firebase Web App config.
Deploy `firebase/firestore.rules` with Firebase CLI or the Firebase console.

## Public appointment booking

`modules/crm/public-booking/public-booking.html` is the shareable, unauthenticated booking request page. It collects a preferred branch, date/time, patient name, and 10-digit mobile number. Requests remain pending until staff review them in **Appointments → Public Booking Requests**, where the mobile is matched against patients in the selected branch and the request can be converted into an appointment.

Deploy the updated `firebase/firestore.rules` before publishing the page. Public access to the `branches` collection is used to populate the branch selector; keep branch documents limited to information intended for public visibility. Public requests can be submitted but cannot be read by unauthenticated users.
Admins can review requests for all branches. Branch users can view, convert, or decline requests only for their assigned branch; Firestore rules enforce this restriction.

Appointment saves check for duplicates using branch, date, time, therapist, and patient filters before creating the appointment in a transaction. The matching composite index is listed in `firebase/firestore.indexes.json`. Appointment document IDs use the `APT-####` sequence, and the record's `id` field matches its document ID.

Dashboard and attendance views resolve old attendance employee references against current staff and therapist document IDs, using the old employee ID first and a unique name/branch/type match when an ID was changed.

The appointment page loads the patient list only when a form is opened or pending bookings need patient matching, reuses cached patient document IDs during saves, and skips writes to linked sales/receipt records when their values have not changed. If a date-query index is missing, the page reports the index error instead of retrying with a full-branch scan.

## Firestore usage dashboard

The admin-only `modules/settings/usage/usage.html` page displays actual Cloud Monitoring metrics for the default Firestore database: document reads, writes, deletes, and stored bytes. Operation graphs cover the latest 14 Pacific calendar days. Metrics update about once per minute and can take up to four minutes to appear; the free-tier numbers are reference limits, not billing alerts. Outbound network transfer is not included.

The page calls the `getFirestoreUsage` callable Cloud Function; Google Cloud credentials are never placed in the browser. Deploying Cloud Functions requires the Firebase project to use the Blaze plan. Before deployment:

1. Sign in to Firebase CLI: `npx firebase-tools login`.
2. Enable the Cloud Monitoring API: `gcloud services enable monitoring.googleapis.com --project cmf001stra`.
3. Deploy the callable: `npx firebase-tools deploy --config firebase/firebase.json --only functions:getFirestoreUsage --project cmf001stra`.
4. In Google Cloud IAM, grant the deployed function's runtime service account the **Monitoring Viewer** role (`roles/monitoring.viewer`) on project `cmf001stra`.

The function independently verifies the signed-in user's `users/{lowercase-email}` profile has `role: "admin"`. The metrics use the function's service identity and are restricted to Firestore's `(default)` database.

## Full database backup

Admins can download the full backup as one JSON file, as a ZIP containing one JSON file per exported collection, or as a ZIP containing one CSV file per exported collection. ZIP backups include a `manifest.json` with the generation time, selected date range, and document counts. CSV rows represent documents; nested arrays and objects are JSON-encoded within their cells, and timestamps are ISO 8601 strings. Blank start and end dates export all available history; optional dates filter records by their date, creation date, or update date. Collection reads are paginated in batches of 500. The export includes appointments, booking requests, branches, attendance, estimates, leave requests, ledger categories, ledgers, patients, staff, tasks, therapists, transactions, users, and the company profile in settings.

Admins can import a CSV ZIP produced by the full-backup CSV export. Import adds documents only when their IDs do not already exist, counts and skips existing IDs, and provides a CSV report of skipped IDs. It never overwrites or deletes existing documents. Before importing, deploy the updated admin restore rules with `npx firebase-tools deploy --config firebase/firebase.json --only firestore:rules --project cmf001stra`. Imports add read/write usage and are applied in batches, so an error can leave earlier batches imported.

The Export & Backup page provides a CSV sample for each selectable data module and admin-only module CSV import. Appointment, branch, attendance, patient, staff, therapist, and transaction documents use `APT`, `BRA`, `ATT`, `PAT`, `STA`, `THE`, and `TRA` IDs, respectively; the record's `id` field matches its document ID. A shared Firestore counter allocates IDs atomically across branches. Deploy `firebase/firestore.rules` and sign in as an administrator once after deployment to initialize counters from the existing document IDs. Branch users can then create records using the initialized counters. Existing documents are skipped and never overwritten by module CSV import. Import appointments from **Appointments → More Actions → Import CSV** so linked patient and transaction records are handled correctly; that importer requires `APT-####` IDs and accepts comma- or tab-delimited files, including `DD-MM-YYYY` dates. Full-backup restore preserves original document IDs. Users and company settings remain available through full-backup import/export rather than module CSV import. My Task remains local to the browser and is not included in module CSV import.

Deploy `firebase/firestore.rules` after changing the backup access rules. Admins need read access to estimates, ledger data, and all tasks for a complete backup. If the export reports a permission or connection error, it does not produce a partial file.

## Attendance and appointment query indexes

Appointment and attendance lists query by branch and apply date filters in the page to avoid requiring compound branch/date indexes. The views accept both ISO (`YYYY-MM-DD`) and legacy day-first (`DD-MM-YYYY` or `DD/MM/YYYY`) date strings. Appointment filters default to today; attendance defaults to today and has a month selector for history. Patient lookups still use branch and mobile together and may require the corresponding index in `firebase/firestore.indexes.json`.
Admins can manage attendance across branches. Branch users can view, add, edit, and delete attendance only for their assigned branch; Firestore rules enforce the branch restriction.

`firebase/firebase.json` maps the Firestore rules and indexes to Firebase CLI. From this directory, deploy the indexes to the app's Firebase project with:

```sh
npx firebase-tools deploy --config firebase/firebase.json --only firestore:indexes --project cmf001stra
```

Wait until the indexes show **Enabled** in Firebase Console → Firestore Database → Indexes, then reload the app. If the attendance page still shows the old generic error after refreshing the deployed site, publish the latest `modules/hr/attendance/attendance.html` as well.

## Module files

The app name and module routes are centralized in `js/app-metadata.js`; `manifest.webmanifest` uses the same name for installation metadata. Each module has its own folder under `modules/<category>/<module>/`, with its page and CSS/JavaScript files together. Shared shell components live under `components/`. The app shell resolves module resources relative to each page, so keep each module's files together when moving or adding modules.

Interactive account, CRM, HR, and settings modules that contain forms or tables use the shared responsive form/list styling in `components/form-view.css`, based on the table and row patterns in `components/form.html`. Print and template modules are not included. Since module stylesheets are loaded into the shared app document, keep page-level selectors scoped to the module root; the app shell also resets body margin and padding to prevent module styles from shifting the navigation header.

The app shell presents active module pages in a full-height flex column using the same `#FAFAFB` background as the dashboard; keep that background on the shell and active module roots rather than setting page-level backgrounds.

## Transaction module storage

The Transactions & Vouchers module continues to use Firebase and remains linked to Payments, Receipts, and Ledgers.

The **My Task** module stores personal tasks in browser localStorage under the signed-in Firebase UID. Tasks are local to that browser/device and do not sync between devices. Existing Firestore task records are not automatically copied into local storage.

## Developer Workspace

The Developer role uses the same Firebase sign-in as Care. An admin can assign Developer in Settings → Users after the updated functions and Firestore rules are deployed. Developer accounts open the Developer Workspace and can access the licence and privacy pages. Developer accounts have no internal clinic-record, accounting, task or user-management access. Existing public clinic directory and booking rules apply to all visitors.

The Admin Visibility section controls which Developer Workspace sections admins see. Billing is off for admins by default. The existing admin Firestore Usage page retains its administrator access.

### Connect Google Cloud data

- Deploy the updated Firestore rules and these Cloud Functions to the Care Firebase project: `createManagedUser`, `updateManagedUser`, `getDeveloperWorkspace`, `saveDeveloperWorkspaceSettings`, and `getDeveloperWorkspaceMetrics`. Use the configuration in `stra/firebase/firebase.json`.
- Enable the Cloud Monitoring API and grant the runtime service account Monitoring Viewer for the Care project. The dashboard reports operation counts, which can differ from billed operations.
- To display exported costs, enable the standard or detailed Cloud Billing export to BigQuery. Set `CARE_BILLING_EXPORT_TABLE` in the functions environment to the fully qualified `project.dataset.table` identifier. Set `CARE_BILLING_EXPORT_LOCATION` if required for the dataset region. Grant the runtime service account BigQuery Data Viewer on the export dataset and BigQuery Job User in the Care project. The query is capped at 1 GiB per run, cached for five minutes, and returns only the Care project's month-to-date totals.
- Confirm a Developer can load this page and metrics, that a standard user is denied, and that toggling Admin Billing changes access before relying on the new configuration. The export updates on Google's reporting schedule. The Cloud Billing link uses the viewer's own Google Cloud permissions.

## Care sign-in and approval

- Enable **Email/Password**, **Phone** and **Google** in Firebase Authentication. Add the deployed Care hostname to Authorized Domains. Configure the Google provider's project support email and allow India in the Authentication SMS region policy. Use Firebase test phone numbers before sending real SMS.
- Deploy the updated Firestore rules and the updated Cloud Functions together. The sign-in flow uses `getCareAccess`, `requestCareAccess`, `listCareAccessRequests` and `reviewCareAccess`. Deploy the updated user-management and Developer Workspace callables too.
- An existing email/password account keeps its existing profile. For older profiles that predate UID binding, Care binds the matching Auth UID only when the Auth account predates or matches the profile creation timestamp. An administrator must reconcile profiles created before their Auth accounts. This avoids granting an orphaned profile to a newly registered account.
- Email sign-up requires email verification. Phone users verify by OTP. Google sign-in uses the verified Google email where available. New identities request access and remain pending until a Developer or Admin assigns an existing branch and approves the request. Approval creates a standard user role only. Firebase provider identities are not automatically merged.
- The UI adds `+91` for Indian OTP sign-in and displays it on patient, appointment and public-booking mobile inputs. The clinic record fields keep their existing 10-digit format for lookups and imports.
