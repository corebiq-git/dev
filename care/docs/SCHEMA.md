# Firestore model — Phase 1

Single organization. `organizations/default` is provisioned administratively; no public registration.

Operational collections: `users`, `branches`, `staff`, `patients`, `services`, `appointments`.
Trusted-server collections: `counters`, `appointmentLocks`, `auditLogs`.
Future collections reserved in the architecture: `serviceCategories`, `sessions`, `clinicalAssessments`, `treatmentRecords`, `clinicalReports`, `packages`, `packageSubscriptions`, `payments`, `invoices`, `receipts`, `quotations`, `creditNotes`, `refunds`, `expenses`, `enquiries`, `notifications`, `notificationQueue`, `documentTemplates`, `generatedDocuments`, `settings`, `systemLogs`, `integrationSettings`.

Document IDs are random Firestore IDs. Business IDs follow XXXYY-####, with counters transactionally incremented in Cloud Functions (at most 9999 IDs per module and year; issuance fails closed on overflow). Counters are never decremented.

**Important limitations:** Phase 1 appointment implementation locks only identical start times. It is NOT yet overlap-safe for unequal start times or service durations and must NOT be used for real clinical scheduling until schedule/leave/holiday/overlap checks are implemented. Current patient read rules are branch-scoped but not treatment-assignment/purpose-scoped. Do NOT deploy this stage with live patient data.

Firestore queries need to be restricted by permitted branch for branch staff; the current generic list view may be rejected by security rules. Pending improvement.
