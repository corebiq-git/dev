const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { FieldPath, getFirestore } = require('firebase-admin/firestore');

async function main() {
    const [projectId, mode] = process.argv.slice(2);
    if (!projectId || (mode && mode !== '--apply')) {
        throw new Error('Usage: node backfill-patient-search.cjs <project-id> [--apply]');
    }
    const { normalizePatientName } = await import('../js/patient-search.mjs');
    const app = initializeApp({ credential: applicationDefault(), projectId });
    const patients = getFirestore(app).collection('patients').orderBy(FieldPath.documentId());
    let cursor;
    let checked = 0;
    let changed = 0;
    let conflicts = 0;

    while (true) {
        const page = await (cursor ? patients.startAfter(cursor) : patients).limit(250).get();
        if (page.empty) break;
        for (const patient of page.docs) {
            checked += 1;
            const { name, nameSearch } = patient.data();
            if (typeof name !== 'string') continue;
            const normalized = normalizePatientName(name);
            if (nameSearch === normalized) continue;
            if (mode === '--apply') {
                try {
                    await patient.ref.update({ nameSearch: normalized }, { lastUpdateTime: patient.updateTime });
                } catch (error) {
                    if (error.code !== 9 && error.code !== 5) throw error;
                    conflicts += 1;
                    continue;
                }
            }
            changed += 1;
        }
        cursor = page.docs.at(-1);
        if (page.size < 250) break;
    }

    console.log(JSON.stringify({ mode: mode ? 'apply' : 'dry-run', checked, changed, conflicts }));
    if (conflicts) process.exitCode = 1;
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
