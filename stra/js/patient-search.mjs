export function normalizePatientName(name) {
    return String(name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function patientBranchFilters(user, where) {
    if (!user) throw new Error('Your account profile is not available.');
    if (user.role === 'admin') return [];
    const branch = String(user.branch || '').trim();
    if (!branch || branch === 'Unknown') throw new Error('Your account has no assigned branch.');
    return [where('branch', '==', branch)];
}
