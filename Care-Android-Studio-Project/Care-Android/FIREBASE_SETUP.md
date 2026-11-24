# Firebase setup

- Firebase project: `cb40001`
- Android package: `com.corebiq.care`
- Android app registration: configured through the supplied `app/google-services.json`

Enable Email/Password in Firebase Authentication if using the sign-in screen. Create Firestore and Storage only when needed, then deploy restrictive security rules before storing clinic or patient data. The dashboard preview mode is local-only and does not read or write Firebase data.
