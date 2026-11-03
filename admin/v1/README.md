# COREBIQ fresh Firebase starter

This starter is for the already-created Firebase project, with Cloud Firestore and email/password Authentication.

## 1. Put Firebase config in place
In Firebase Console:
- Project settings → General → Your apps → register a Web app if needed.
- Copy the Firebase web configuration into `firebase-config.js`.
- Replace `YOUR_PROJECT_ID` and the other `PASTE_*` values.
- In Firebase Authentication → Users, create your admin email/password account.
- Copy that user's UID into `ADMIN_UID` in `firebase-config.js`.

The Firebase web config is not a server secret. Access is protected by Authentication and Firestore Security Rules. Never put service-account credentials in this client project.

## 2. Enable services
- Authentication → Sign-in method → enable Email/Password.
- Firestore Database → create database (production mode recommended).

## 3. Apply Firestore rules
Replace `PASTE_ADMIN_UID` in `firestore.rules` with the admin UID, then publish the rules in Firestore → Rules. Do not deploy permissive test rules.

The client checks admin UID for UI access; the Firestore Rules are the actual data security enforcement.

## 4. Run locally
Serve this folder through a local web server (not by opening index.html with `file://`). For example:
`python -m http.server 8000`
Then open `http://localhost:8000`.

## 5. Module collections
Starter collection names:
- Dashboard: `dashboard`
- Inventory: `inventory`
- CRM: `customers`
- Accounts: `accounts`
- HR: `employees`
- Report: `reports`
- Data Import & Export: `dataTransfers`
- GST: `gstRecords`
- Tools: `tools`
- Templates: `templates`
- App Info: `appInfo`
- Settings: `settings`
- More: `more`

This is a generic starter CRUD page. Before production, tailor each module's field schema, indexes, validation, audit needs, role access, and navigation links. Do not use generic records for financial posting workflows without additional validation and accounting logic.
