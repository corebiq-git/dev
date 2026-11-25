export function indianMobileDigits(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
}

export function indianMobileE164(value) {
    const digits = indianMobileDigits(value);
    return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}
