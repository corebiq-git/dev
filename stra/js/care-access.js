import { db, app } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js';

const functions = getFunctions(app, 'us-central1');
const check = httpsCallable(functions, 'getCareAccess');
export const requestCareAccess = httpsCallable(functions, 'requestCareAccess');

export function careProfileKey(user) {
    return user.email?.trim().toLowerCase() || `phone_${user.uid}`;
}

export async function resolveCareAccess(user) {
    const ref = doc(db, 'users', careProfileKey(user));
    try {
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) return { status: 'approved', profile: snapshot.data() };
    } catch (error) {
        if (error.code !== 'permission-denied') throw error;
    }
    const { data } = await check();
    if (data.status !== 'approved') return data;
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? { status: 'approved', profile: snapshot.data() } : { status: 'unavailable' };
}

export async function checkRegistrationBackend() {
    try {
        await check();
    } catch (error) {
        if (error.code !== 'functions/unauthenticated') throw error;
    }
}
