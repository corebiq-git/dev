import {
    collection,
    doc,
    getDoc,
    getDocs,
    runTransaction,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

export const DOCUMENT_ID_CONFIG = Object.freeze([
    { collection: 'appointments', prefix: 'APT' },
    { collection: 'branches', prefix: 'BRN' },
    { collection: 'daily_attendance', prefix: 'ATT' },
    { collection: 'ledgers', prefix: 'LDR', sourceField: 'ledgerNo' },
    { collection: 'patients', prefix: 'PAT' },
    { collection: 'staff', prefix: 'STF' },
    { collection: 'therapists', prefix: 'THE' },
    { collection: 'transactions', prefix: 'TRA' }
]);

function getDocumentIdFormat(collectionName) {
    const config = DOCUMENT_ID_CONFIG.find(item => item.collection === collectionName);
    return {
        separator: config?.separator || '-',
        minDigits: config?.minDigits || 4,
        sourceField: config?.sourceField || null
    };
}

function parseDocumentId(id, prefix, separator, minDigits) {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(id || '').match(new RegExp(`^${escapedPrefix}${escapedSeparator}(\\d{${minDigits},})$`));
    return match ? Number(match[1]) : null;
}

async function initializeCounter(db, collectionName, prefix) {
    const counterRef = doc(db, 'id_counters', collectionName);
    const { separator, minDigits, sourceField } = getDocumentIdFormat(collectionName);
    const currentCounter = await getDoc(counterRef);
    if (currentCounter.exists()) return;

    const existingDocuments = await getDocs(collection(db, collectionName));
    const lastIssued = existingDocuments.docs.reduce((highest, snapshot) => {
        const source = sourceField ? snapshot.data()[sourceField] : snapshot.id;
        const legacy = {branches:['BRA','-',4],staff:['STA','-',4],ledgers:['LD/COREBIQ','/',3]}[collectionName];
        const number = parseDocumentId(source, prefix, separator, minDigits) ?? (legacy ? parseDocumentId(source, ...legacy) : null);
        return number === null ? highest : Math.max(highest, number);
    }, 0);

    await runTransaction(db, async transaction => {
        const counter = await transaction.get(counterRef);
        if (!counter.exists()) {
            transaction.set(counterRef, { lastIssued, updatedAt: serverTimestamp() });
        } else if (sourceField) {
            const currentLastIssued = Number(counter.data().lastIssued);
            if (!Number.isSafeInteger(currentLastIssued) || currentLastIssued < 0) {
                throw new Error(`The ${collectionName} ID counter is invalid.`);
            }
            if (lastIssued > currentLastIssued) {
                transaction.update(counterRef, { lastIssued, updatedAt: serverTimestamp() });
            }
        }
    });
}

export async function initializeDocumentIdCounters(db) {
    for (const { collection: collectionName, prefix } of DOCUMENT_ID_CONFIG) {
        await initializeCounter(db, collectionName, prefix);
    }
}

export async function reserveNextDocumentIds(db, collectionName, prefix, count = 1, canInitialize = false) {
    prefix = DOCUMENT_ID_CONFIG.find(item => item.collection === collectionName)?.prefix || prefix;
    if (!Number.isInteger(count) || count < 1 || count > 500) {
        throw new Error('Document ID reservation count must be between 1 and 500.');
    }

    const counterRef = doc(db, 'id_counters', collectionName);
    if (!(await getDoc(counterRef)).exists()) {
        if (!canInitialize) {
            throw new Error(`Sequential IDs for ${collectionName} are not initialized. Ask an administrator to open the dashboard once.`);
        }
        await initializeCounter(db, collectionName, prefix);
    }

    const { separator, minDigits } = getDocumentIdFormat(collectionName);
    return runTransaction(db, async transaction => {
        const counter = await transaction.get(counterRef);
        if (!counter.exists()) {
            throw new Error(`Sequential IDs for ${collectionName} are not initialized. Ask an administrator to open the dashboard once.`);
        }
        const lastIssued = Number(counter.data().lastIssued);
        if (!Number.isSafeInteger(lastIssued) || lastIssued < 0) {
            throw new Error(`The ${collectionName} ID counter is invalid.`);
        }
        const first = lastIssued + 1;
        transaction.update(counterRef, {
            lastIssued: lastIssued + count,
            updatedAt: serverTimestamp()
        });
        return Array.from({ length: count }, (_, index) =>
            `${prefix}${separator}${String(first + index).padStart(minDigits, '0')}`
        );
    });
}

export async function getNextDocumentIdPreview(db, collectionName, prefix, canInitialize = false) {
    prefix = DOCUMENT_ID_CONFIG.find(item => item.collection === collectionName)?.prefix || prefix;
    const counterRef = doc(db, 'id_counters', collectionName);
    if (!(await getDoc(counterRef)).exists()) {
        if (!canInitialize) {
            throw new Error(`Sequential IDs for ${collectionName} are not initialized. Ask an administrator to open the dashboard once.`);
        }
        await initializeCounter(db, collectionName, prefix);
    }

    const counter = await getDoc(counterRef);
    if (!counter.exists()) {
        throw new Error(`Sequential IDs for ${collectionName} are not initialized.`);
    }
    const lastIssued = Number(counter.data().lastIssued);
    if (!Number.isSafeInteger(lastIssued) || lastIssued < 0) {
        throw new Error(`The ${collectionName} ID counter is invalid.`);
    }
    const { separator, minDigits } = getDocumentIdFormat(collectionName);
    return `${prefix}${separator}${String(lastIssued + 1).padStart(minDigits, '0')}`;
}

export async function advanceDocumentIdCounter(db, collectionName, prefix, ids, canInitialize = false) {
    prefix = DOCUMENT_ID_CONFIG.find(item => item.collection === collectionName)?.prefix || prefix;
    const { separator, minDigits } = getDocumentIdFormat(collectionName);
    const highestImported = ids
        .map(id => parseDocumentId(id, prefix, separator, minDigits))
        .filter(Number.isSafeInteger)
        .reduce((highest, number) => Math.max(highest, number), 0);
    if (!highestImported) return;

    const counterRef = doc(db, 'id_counters', collectionName);
    if (!(await getDoc(counterRef)).exists()) {
        if (!canInitialize) {
            throw new Error(`Sequential IDs for ${collectionName} are not initialized. Ask an administrator to open the dashboard once.`);
        }
        await initializeCounter(db, collectionName, prefix);
    }
    await runTransaction(db, async transaction => {
        const counter = await transaction.get(counterRef);
        if (!counter.exists()) {
            throw new Error(`Sequential IDs for ${collectionName} are not initialized.`);
        }
        const lastIssued = Number(counter.data().lastIssued);
        if (highestImported > lastIssued) {
            transaction.update(counterRef, {
                lastIssued: highestImported,
                updatedAt: serverTimestamp()
            });
        }
    });
}
