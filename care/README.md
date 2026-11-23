# COREBIQ Care

Phase 1 development foundation for the single-organization, multi-branch healthcare application.

**Status:** In development; not ready for production patient data.

The full Phase 1 source archive was generated separately. This GitHub folder is currently an incomplete upload and must not be deployed until all source modules, Firebase security rules, and Cloud Functions are added and verified.

## Local development

Install dependencies with `npm install`, configure Firebase environment values, then run `npm run dev` once the remaining source files are present.

## Security

Never place Firebase service-account credentials, Razorpay secrets, or WhatsApp tokens in frontend files.
