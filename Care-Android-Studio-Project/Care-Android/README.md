# Care — Powered by COREBIQ

Native Android starter application for `com.corebiq.care`, connected to Firebase project `cb40001`.

## First build scope
- Care-branded sign-in screen with Firebase Email/Password authentication.
- A local dashboard preview mode (placeholder figures only; no authenticated clinic data is exposed).
- Material 3 dashboard with a modal sidebar, module navigation, branch selector, KPI cards, quick actions, workspace shortcuts and schedule placeholder.
- Responsive Compose layouts intended for Android phones and larger screens.
- Module landing placeholders for Patients, Appointments, Therapy Plans, Billing & Payments, Branches, Staff & Therapists, Attendance, Reports, Documents and Settings.

## Build a debug APK
1. Open this folder in Android Studio.
2. Wait for Gradle sync to finish.
3. Select **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. Android Studio writes the debug APK to `app/build/outputs/apk/debug/app-debug.apk`.

## Important scope note
This is the first UI/dashboard build, not a production clinic-management release. KPI values are intentionally placeholders. Module pages do not yet implement patient records, appointment CRUD, billing, document upload, staff roles, Firestore data access, push notifications or production security rules. Preview mode is local UI preview only and does not authenticate or access Firebase data.

## Firebase
The Android `google-services.json` is included for package `com.corebiq.care`. Configure Firebase Authentication providers and secure Firestore/Storage rules in Firebase Console before enabling real data workflows. Never place service-account credentials in the Android app.
