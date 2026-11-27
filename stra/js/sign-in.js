import { auth } from './firebase-config.js';
import { checkRegistrationBackend, requestCareAccess, resolveCareAccess } from './care-access.js';
import { indianMobileDigits, indianMobileE164 } from './indian-phone.mjs';
import {
    GoogleAuthProvider, RecaptchaVerifier, browserLocalPersistence, browserSessionPersistence,
    createUserWithEmailAndPassword, onAuthStateChanged, reload, sendEmailVerification,
    sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signInWithPhoneNumber,
    signInWithPopup, signOut, updateProfile
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';

const byId = id => document.getElementById(id);
const panels = { login: 'login-methods', signup: 'signup-panel', reset: 'reset-panel', access: 'access-panel' };
const phoneInput = byId('mobile-number');
const feedback = byId('auth-status');
let verifier;
let confirmation;
let acting = false;
let stateVersion = 0;
let activePanel = "login";
let approvedRedirect = false;
let activeMethod = "email";
const rememberOption = byId("remember-option");

function notice(text, error = false) {
    feedback.hidden = !text;
    feedback.textContent = text;
    feedback.classList.toggle('is-error', error);
}

function placeRememberOption() {
    const submit = activePanel === 'signup'
        ? byId('signup-form').querySelector('button[type="submit"]')
        : activeMethod === 'google' ? byId('google-login')
        : activeMethod === 'mobile'
            ? byId(byId('otp-form').hidden ? 'mobile-form' : 'otp-form').querySelector('button[type="submit"]')
            : byId('login-form').querySelector('button[type="submit"]');
    submit.before(rememberOption);
}
function showPanel(panel) {
    activePanel = panel;
    for (const [key, id] of Object.entries(panels)) byId(id).hidden = key !== panel;
    if (panel === 'login' || panel === 'signup') placeRememberOption();
}

function setMethod(method) {
    activeMethod = method;
    byId('login-form').hidden = method !== 'email';
    byId('mobile-form-box').hidden = method !== 'mobile';
    byId('google-form-box').hidden = method !== 'google';
    placeRememberOption();
    document.querySelectorAll('[data-method]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.method === method));
    });
    notice('');
}

function friendlyError(error) {
    const messages = {
        'auth/invalid-credential': 'The sign-in details could not be verified.',
        'auth/invalid-verification-code': 'That code is incorrect. Check the SMS and try again.',
        'auth/code-expired': 'That code has expired. Request a new OTP.',
        'auth/operation-not-allowed': 'This sign-in method has not been enabled in Firebase.',
        'auth/unauthorized-domain': 'This site must be added to Firebase Authentication’s authorized domains.',
        'auth/popup-blocked': 'Allow popups for this site, then try Google again.',
        'auth/popup-closed-by-user': 'Google sign-in was closed.',
        'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
        'auth/email-already-in-use': 'An account already exists. Sign in or reset your password.',
        'functions/not-found': 'Care access approval is not available on this deployment.'
    };
    return messages[error.code] || 'This action could not be completed. Please try again or contact support.';
}

async function displayAccess(user, reloadIdentity = false) {
    const version = ++stateVersion;
    if (!user) { showPanel('login'); return; }
    if (reloadIdentity) {
        await reload(user);
        await user.getIdToken(true);
    }
    const { status } = await resolveCareAccess(user);
    if (version !== stateVersion || auth.currentUser?.uid !== user.uid) return;
    if (status === 'approved') {
        if (approvedRedirect) return;
        approvedRedirect = true;
        // Remove the duplicate login history entry before opening the workspace.
        if (history.state?.careLoginGuard) history.back();
        else window.location.replace('./index.html');
        return;
    }

    showPanel('access');
    const needsEmail = Boolean(user.email && !user.emailVerified);
    byId('access-form').hidden = status !== 'unregistered' || needsEmail;
    byId('resend-verification').hidden = !needsEmail;
    if (!byId('access-name').value) byId('access-name').value = user.displayName || '';
    const messages = {
        pending: ['Approval pending', 'A Developer or Admin will review your request. Use Check status after approval.'],
        rejected: ['Access not approved', 'Contact your clinic administrator for help.'],
        unavailable: ['Access unavailable', 'Contact your clinic administrator to restore access.'],
        unregistered: needsEmail
            ? ['Verify your email', 'Open the verification link in your email, then select Check status.']
            : ['Request access', 'A Developer or Admin must approve your account and assign a clinic branch.']
    };
    const [title, description] = messages[status] || messages.unavailable;
    byId('access-title').textContent = title;
    byId('access-description').textContent = description;
}

function resetPhoneFlow() {
    confirmation = null;
    verifier?.clear();
    verifier = undefined;
    byId('mobile-form').hidden = false;
    byId('otp-form').hidden = true;
    byId('mobile-otp').value = '';
    if (activePanel === 'login' && activeMethod === 'mobile') placeRememberOption();
}

async function run(control, action) {
    if (acting) return;
    acting = true;
    control.disabled = true;
    notice('');
    const loader = window.createCareLoader?.('Please wait', 'inline');
    if (loader) feedback.before(loader);
    try { await action(); }
    catch (error) {
        if (auth.currentUser) showPanel('access');
        notice(friendlyError(error), true);
    }
    finally {
        loader?.remove();
        control.disabled = false;
        acting = false;
    }
}

const persistence = () => setPersistence(auth, byId('rememberMe').checked ? browserLocalPersistence : browserSessionPersistence);
function onSubmit(id, action) {
    const form = byId(id);
    form.addEventListener('submit', event => {
        event.preventDefault();
        void run(form.querySelector('button[type="submit"]'), action);
    });
}

byId('toggle-login-password').addEventListener('click', event => {
    const password = byId('loginPassword');
    const reveal = password.type === 'password';
    password.type = reveal ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
    event.currentTarget.querySelector('[data-password-icon="hidden"]').toggleAttribute('hidden', reveal);
    event.currentTarget.querySelector('[data-password-icon="shown"]').toggleAttribute('hidden', !reveal);
});

document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => setMethod(button.dataset.method)));
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
    notice('');
    if (button.dataset.panel === 'reset') byId('resetEmail').value = byId('loginEmail').value;
    showPanel(button.dataset.panel);
}));

phoneInput.addEventListener('input', () => { phoneInput.value = indianMobileDigits(phoneInput.value); });
onSubmit('login-form', async () => {
    await persistence();
    const { user } = await signInWithEmailAndPassword(auth, byId('loginEmail').value.trim(), byId('loginPassword').value);
    await displayAccess(user);
});
byId('google-login').addEventListener('click', event => void run(event.currentTarget, async () => {
    await persistence();
    const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
    await displayAccess(user);
}));
onSubmit('mobile-form', async () => {
    const number = indianMobileE164(phoneInput.value);
    if (!number) { notice('Enter a valid 10-digit Indian mobile number.', true); return; }
    await persistence();
    verifier ||= new RecaptchaVerifier(auth, 'care-recaptcha', { size: 'invisible' });
    try {
        confirmation = await signInWithPhoneNumber(auth, number, verifier);
        byId('mobile-form').hidden = true;
        byId('otp-form').hidden = false;
        placeRememberOption();
        byId('mobile-otp').focus();
        notice('OTP sent to ' + number);
    } catch (error) {
        resetPhoneFlow();
        throw error;
    }
});
byId('change-mobile').addEventListener('click', resetPhoneFlow);
onSubmit('otp-form', async () => {
    if (!confirmation) return;
    await persistence();
    const { user } = await confirmation.confirm(byId('mobile-otp').value.trim());
    await displayAccess(user);
});
onSubmit('signup-form', async () => {
    await checkRegistrationBackend();
    await persistence();
    const { user } = await createUserWithEmailAndPassword(auth, byId('signup-email').value.trim(), byId('signup-password').value);
    const displayName = byId('signup-name').value.trim();
    byId('access-name').value = displayName;
    try {
        await updateProfile(user, { displayName });
        await sendEmailVerification(user);
    }
    finally { await displayAccess(user); }
});
onSubmit('access-form', async () => {
    await requestCareAccess({ name: byId('access-name').value.trim() });
    await displayAccess(auth.currentUser);
});
onSubmit('reset-form', async () => {
    try { await sendPasswordResetEmail(auth, byId('resetEmail').value.trim()); }
    catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    notice('If an account exists for that email, a reset link will be sent.');
});
byId('check-access').addEventListener('click', event =>
    void run(event.currentTarget, () => displayAccess(auth.currentUser, true)));
byId('resend-verification').addEventListener('click', event => void run(event.currentTarget, async () => {
    await sendEmailVerification(auth.currentUser);
    notice('Verification email sent.');
}));
byId('auth-signout').addEventListener('click', event => void run(event.currentTarget, async () => {
    await signOut(auth);
    resetPhoneFlow();
    byId('access-name').value = '';
    showPanel('login');
}));

onAuthStateChanged(auth, user => {
    if (acting) return;
    void displayAccess(user).catch(error => {
        if (user) showPanel('access');
        notice(friendlyError(error), true);
    });
});

// Keep mobile Back within sign-in until the user explicitly confirms exit.
let loginExitPrompt = false;
let loginLeaving = false;
function armLoginBackGuard() {
    if (history.state?.careLoginGuard) return;
    history.replaceState({ ...(history.state || {}), careLoginRoot: true }, '', location.href);
    history.pushState({ careLoginGuard: true }, '', location.href);
}
armLoginBackGuard();
window.addEventListener('popstate', async event => {
    if (approvedRedirect) { window.location.replace('./index.html'); return; }
    if (loginLeaving || event.state?.careLoginGuard) return;
    armLoginBackGuard();
    if (loginExitPrompt || acting) return;
    if (activePanel === 'signup' || activePanel === 'reset') { showPanel('login'); notice(''); return; }
    if (activePanel === 'login' && activeMethod === 'mobile' && !byId('otp-form').hidden) { resetPhoneFlow(); notice(''); return; }
    if (activePanel === 'login' && activeMethod !== 'email') { setMethod('email'); return; }
    loginExitPrompt = true;
    try {
        const confirmed = await (window.careConfirm
            ? window.careConfirm('Do you want to exit COREBIQ Care?', { title: 'Exit application?', action: 'Exit' })
            : Promise.resolve(window.confirm('Do you want to exit COREBIQ Care?')));
        if (confirmed && history.length > 2) {
            loginLeaving = true;
            history.go(-2);
        }
    } finally { loginExitPrompt = false; }
});
