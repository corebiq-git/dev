import { collection, doc, getDocs, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const DOCUMENT_ID_CONFIG = Object.freeze([
  { collection: "branches", prefix: "BRA", idField: "branchId" },
  { collection: "daily_attendance", prefix: "ATT", idField: "id" },
  { collection: "patients", prefix: "PAT", idField: "patientId" },
  { collection: "staff", prefix: "STA", idField: "empId" },
  { collection: "therapists", prefix: "THE", idField: "therapistId" },
  { collection: "transactions", prefix: "TRA", idField: "txnId" },
  { collection: "hr_employees", prefix: "EMP", idField: "employeeId" }
]);

function sequenceFromId(value, prefix) {
  const match = String(value || "").match(new RegExp(`^${prefix}(?:-|)?(?:\\d{2}-)?(\\d+)$`, "i"));
  return match ? Number(match[1]) : 0;
}

export async function advanceDocumentIdCounter(db, collectionName, prefix, ids = [], includeExisting = false) {
  const counterRef = doc(db, "settings", "counters");
  let highest = ids.reduce((max, id) => Math.max(max, sequenceFromId(id, prefix)), 0);
  if (includeExisting) {
    const snapshot = await getDocs(collection(db, collectionName));
    snapshot.forEach((item) => {
      const data = item.data() || {};
      highest = Math.max(highest, sequenceFromId(data.id || item.id, prefix));
    });
  }
  const key = `${String(prefix).toLowerCase()}Sequence`;
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(counterRef);
    const stored = Number(current.exists() ? current.data()[key] : 0) || 0;
    if (highest > stored) transaction.set(counterRef, { [key]: highest }, { merge: true });
  });
}
