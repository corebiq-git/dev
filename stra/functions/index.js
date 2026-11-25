const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { GoogleAuth } = require('google-auth-library');

initializeApp();

const monitoringAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/monitoring.read']
});
const projectId = process.env.GCLOUD_PROJECT;
const databaseId = '(default)';
const timezone = 'America/Los_Angeles';
const freeTier = {
  reads: 50000,
  writes: 20000,
  deletes: 20000,
  storageBytes: 1024 ** 3
};
const metrics = {
  reads: 'firestore.googleapis.com/document/read_ops_count',
  writes: 'firestore.googleapis.com/document/write_ops_count',
  deletes: 'firestore.googleapis.com/document/delete_ops_count',
  storageBytes: 'firestore.googleapis.com/storage/total_bytes'
};

function normalizeEmail(value) {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'A valid email address is required.');
  }
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'A valid email address is required.');
  }
  return email;
}

function validateUserFields(data) {
  const role = data.role;
  const branch = role === 'admin' ? 'ALL' : role === 'developer' ? 'DEVELOPER' : typeof data.branch === 'string' ? data.branch.trim() : '';
  if (!['admin', 'developer', 'user'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Select a supported role.');
  }
  if (!branch) {
    throw new HttpsError('invalid-argument', 'A branch assignment is required for standard users.');
  }
  return { role, branch };
}

function careProfileKey(auth) {
  const email = auth.token.email;
  if (typeof email === 'string' && email.trim()) return email.trim().toLowerCase();
  return typeof auth.token.phone_number === 'string' ? `phone_${auth.uid}` : null;
}

async function careProfile(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to Care first.');
  const key = careProfileKey(request.auth);
  if (!key) throw new HttpsError('permission-denied', 'An email or verified mobile number is required.');
  const db = getFirestore();
  const ref = db.doc(`users/${key}`);
  const uid = request.auth.uid;
  const snapshot = await ref.get();
  if (!snapshot.exists) return { db, key, profile: null };
  const data = snapshot.data();
  if (data.authUid === uid) return { db, key, profile: data };
  if (data.authUid || key.startsWith('phone_')) return { db, key, profile: null };

  // Only bind a legacy email profile to an Auth account that already existed at profile creation.
  const identity = await getAuth().getUser(uid);
  const createdAt = Date.parse(identity.metadata.creationTime);
  if (identity.disabled || identity.email?.trim().toLowerCase() !== key ||
      !Number.isFinite(createdAt) || !snapshot.createTime || createdAt > snapshot.createTime.toMillis()) {
    return { db, key, profile: null };
  }
  const profile = await db.runTransaction(async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists || current.createTime.toMillis() !== snapshot.createTime.toMillis()) return null;
    const currentData = current.data();
    if (currentData.authUid && currentData.authUid !== uid) return null;
    if (!currentData.authUid) transaction.update(ref, { authUid: uid });
    return { ...currentData, authUid: uid };
  });
  return { db, key, profile };
}

async function requireAdmin(request) {
  const { db, key, profile } = await careProfile(request);
  if (profile?.role !== 'admin') throw new HttpsError('permission-denied', 'Only administrators can manage users.');
  return { db, callerEmail: key };
}

function managedProfileKey(value) {
  return typeof value === 'string' && /^phone_[A-Za-z0-9_-]{1,128}$/.test(value) ? value : normalizeEmail(value);
}

function preventSelfManagement(targetEmail, callerEmail) {
  if (targetEmail === callerEmail) {
    throw new HttpsError('failed-precondition', 'You cannot modify or delete your own administrator account.');
  }
}

async function preventLastAdminRemoval(db, targetEmail) {
  const adminSnapshot = await db.collection('users').where('role', '==', 'admin').get();
  if (adminSnapshot.size <= 1 && adminSnapshot.docs.some(snapshot => snapshot.id === targetEmail)) {
    throw new HttpsError('failed-precondition', 'The last administrator cannot be demoted or deleted.');
  }
}

exports.createManagedUser = onCall({ region: 'us-central1' }, async request => {
  const { db } = await requireAdmin(request);
  const email = normalizeEmail(request.data?.email);
  const { role, branch } = validateUserFields(request.data || {});
  const password = request.data?.password;
  if (typeof password !== 'string' || password.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  let userRecord;
  try {
    userRecord = await getAuth().createUser({ email, password });
    await db.doc(`users/${email}`).create({
      role,
      branch,
      authUid: userRecord.uid,
      updatedAt: new Date()
    });
  } catch (error) {
    if (userRecord) {
      try {
        await getAuth().deleteUser(userRecord.uid);
      } catch (rollbackError) {
        logger.error('Unable to roll back Auth account after user profile creation failed.', rollbackError);
      }
    }
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists' || error.code === 6) {
      throw new HttpsError('already-exists', 'An account already exists for this email.');
    }
    logger.error('Unable to create managed user.', error);
    throw new HttpsError('internal', 'Unable to create the user account.');
  }
  return { email };
});

exports.updateManagedUser = onCall({ region: 'us-central1' }, async request => {
  const { db, callerEmail } = await requireAdmin(request);
  const currentEmail = managedProfileKey(request.data?.currentEmail);
  const phoneOnly = currentEmail.startsWith('phone_') && !currentEmail.includes('@');
  const email = phoneOnly ? currentEmail : normalizeEmail(request.data?.email);
  preventSelfManagement(currentEmail, callerEmail);
  const { role, branch } = validateUserFields(request.data || {});
  const password = request.data?.password;
  if (password !== undefined && password !== '' && (typeof password !== 'string' || password.length < 6)) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  const profileRef = db.doc(`users/${currentEmail}`);
  const profileSnapshot = await profileRef.get();
  if (!profileSnapshot.exists) {
    throw new HttpsError('not-found', 'The user profile no longer exists.');
  }
  if (email !== currentEmail && (await db.doc(`users/${email}`).get()).exists) {
    throw new HttpsError('already-exists', 'A user profile already exists for this email.');
  }
  const existingData = profileSnapshot.data();
  if (phoneOnly) {
    if (role !== 'user' || password) {
      throw new HttpsError('invalid-argument', 'Mobile sign-in accounts can only be assigned a standard user branch here.');
    }
    await profileRef.update({ branch, updatedAt: new Date() });
    return { email };
  }
  if (existingData.role === 'admin' && role !== 'admin') {
    await preventLastAdminRemoval(db, currentEmail);
  }

  let userRecord;
  try {
    userRecord = await getAuth().getUserByEmail(currentEmail);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'The Firebase Authentication account was not found.');
    }
    throw error;
  }

  const authUpdate = {};
  if (email !== currentEmail) authUpdate.email = email;
  if (typeof password === 'string' && password) authUpdate.password = password;

  let authEmailChanged = false;
  try {
    if (Object.keys(authUpdate).length) {
      await getAuth().updateUser(userRecord.uid, authUpdate);
      authEmailChanged = email !== currentEmail;
    }
    const newProfileRef = db.doc(`users/${email}`);
    const batch = db.batch();
    batch.set(newProfileRef, { ...existingData, role, branch, authUid: userRecord.uid, updatedAt: new Date() });
    if (email !== currentEmail) batch.delete(profileRef);
    await batch.commit();
  } catch (error) {
    logger.error('Unable to update managed user.', error);
    if (authEmailChanged) {
      try {
        await getAuth().updateUser(userRecord.uid, { email: currentEmail });
      } catch (rollbackError) {
        logger.error('Unable to roll back Auth email after user profile update failed.', rollbackError);
      }
    }
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account already exists for this email.');
    }
    throw new HttpsError('internal', 'Unable to update the user account.');
  }
  return { email };
});

exports.deleteManagedUser = onCall({ region: 'us-central1' }, async request => {
  const { db, callerEmail } = await requireAdmin(request);
  const email = managedProfileKey(request.data?.email);
  preventSelfManagement(email, callerEmail);
  const profileRef = db.doc(`users/${email}`);
  const profileSnapshot = await profileRef.get();
  if (!profileSnapshot.exists) {
    throw new HttpsError('not-found', 'The user profile no longer exists.');
  }
  if (profileSnapshot.data().role === 'admin') {
    await preventLastAdminRemoval(db, email);
  }

  let userRecord;
  try {
    userRecord = email.startsWith('phone_') && !email.includes('@')
      ? await getAuth().getUser(profileSnapshot.data().authUid)
      : await getAuth().getUserByEmail(email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'The Firebase Authentication account was not found.');
    }
    throw error;
  }

  try {
    await getAuth().deleteUser(userRecord.uid);
    await profileRef.delete();
  } catch (error) {
    logger.error('Unable to delete managed user.', error);
    throw new HttpsError('internal', 'Unable to delete the user account.');
  }
  return { email };
});

function pacificDateKey(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function getLastDateKeys(count, lastDateKey) {
  const [year, month, day] = lastDateKey.split('-').map(Number);
  const keys = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(new Date(Date.UTC(year, month - 1, day - offset)).toISOString().slice(0, 10));
  }
  return keys;
}

function numberValue(value) {
  const numeric = Number(value?.int64Value ?? value?.doubleValue ?? value?.intValue ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function queryMetric(metricType, aligner, reducer, startTime, endTime) {
  const client = await monitoringAuth.getClient();
  const filter = [
    `metric.type = "${metricType}"`,
    'resource.type = "firestore_instance"',
    `resource.labels.database_id = "${databaseId}"`
  ].join(' AND ');
  const url = new URL(
    `https://monitoring.googleapis.com/v3/projects/${encodeURIComponent(projectId)}/timeSeries`
  );
  url.searchParams.set('filter', filter);
  url.searchParams.set('interval.startTime', startTime.toISOString());
  url.searchParams.set('interval.endTime', endTime.toISOString());
  url.searchParams.set('aggregation.alignmentPeriod', '3600s');
  url.searchParams.set('aggregation.perSeriesAligner', aligner);
  url.searchParams.set('aggregation.crossSeriesReducer', reducer);

  const response = await client.request({ url: url.toString() });
  return response.data.timeSeries || [];
}

function aggregateDailyValues(series, days, mode) {
  const values = Object.fromEntries(days.map(day => [day, 0]));
  let latest = { time: 0, value: 0 };

  for (const timeSeries of series) {
    for (const point of timeSeries.points || []) {
      const endTime = new Date(point.interval?.endTime || point.interval?.startTime || 0);
      if (!Number.isFinite(endTime.getTime())) continue;
      const day = pacificDateKey(endTime);
      if (!(day in values)) continue;
      const value = numberValue(point.value);

      if (mode === 'max') values[day] = Math.max(values[day], value);
      else values[day] += value;

      if (endTime.getTime() > latest.time) latest = { time: endTime.getTime(), value };
    }
  }

  return { values, latest: latest.value };
}

exports.getFirestoreUsage = onCall({ region: 'us-central1' }, async request => {
  await requireAdmin(request);
  return fetchFirestoreUsage();
});

async function fetchFirestoreUsage() {
  if (!projectId) {
    throw new HttpsError('failed-precondition', 'The Cloud Functions project is not configured.');
  }

  const now = new Date();
  const today = pacificDateKey(now);
  const days = getLastDateKeys(14, today);
  const startTime = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  try {
    const [readSeries, writeSeries, deleteSeries, storageSeries] = await Promise.all([
      queryMetric(metrics.reads, 'ALIGN_SUM', 'REDUCE_SUM', startTime, now),
      queryMetric(metrics.writes, 'ALIGN_SUM', 'REDUCE_SUM', startTime, now),
      queryMetric(metrics.deletes, 'ALIGN_SUM', 'REDUCE_SUM', startTime, now),
      queryMetric(metrics.storageBytes, 'ALIGN_MAX', 'REDUCE_MAX', startTime, now)
    ]);
    const reads = aggregateDailyValues(readSeries, days, 'sum');
    const writes = aggregateDailyValues(writeSeries, days, 'sum');
    const deletes = aggregateDailyValues(deleteSeries, days, 'sum');
    const storage = aggregateDailyValues(storageSeries, days, 'max');
    const daily = days.map(date => ({
      date,
      reads: reads.values[date],
      writes: writes.values[date],
      deletes: deletes.values[date],
      storageBytes: storage.values[date]
    }));
    const todayUsage = daily.find(day => day.date === today);

    return {
      databaseId,
      timezone,
      lastUpdated: now.toISOString(),
      quotas: freeTier,
      current: {
        ...todayUsage,
        storageBytes: storage.latest || todayUsage.storageBytes
      },
      daily
    };
  } catch (error) {
    logger.error('Unable to retrieve Firestore usage from Cloud Monitoring.', error);
    const status = error?.response?.status;
    const message = status === 403
      ? 'Cloud Monitoring access is not configured. Enable the Cloud Monitoring API and grant the function service account Monitoring Viewer.'
      : 'Cloud Monitoring usage metrics could not be loaded. Confirm the Monitoring API is enabled and try again.';
    throw new HttpsError('failed-precondition', message);
  }
}

const workspaceRef = () => getFirestore().doc('settings/developer_workspace');
const adminDefaults = Object.freeze({ subscription: true, info: true, policies: true, alerts: true, usage: true, billing: false });
const billingAuth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
let billingCache;
let billingRequest;

async function requireDeveloperWorkspaceRole(request) {
  const { profile } = await careProfile(request);
  const role = profile?.role;
  if (role !== 'admin' && role !== 'developer') {
    throw new HttpsError('permission-denied', 'Developer Workspace requires the Developer or Admin role.');
  }
  return role;
}

function workspaceSections(role, settings) {
  return Object.fromEntries(Object.entries(adminDefaults).map(([key, fallback]) => [
    key, role === 'developer' || (typeof settings.adminSections?.[key] === 'boolean'
      ? settings.adminSections[key]
      : fallback)
  ]));
}

exports.getDeveloperWorkspace = onCall({ region: 'us-central1' }, async request => {
  const role = await requireDeveloperWorkspaceRole(request);
  const settings = (await workspaceRef().get()).data() || {};
  const sections = workspaceSections(role, settings);
  return {
    role,
    sections,
    projectId: projectId || '',
    ...(sections.subscription ? {
      subscription: { plan: 'Base Plan', purchaseDate: '2026-08-01', validUntil: '2027-08-01' }
    } : {}),
    ...(sections.alerts ? { notice: typeof settings.notice === 'string' ? settings.notice : '' } : {}),
    ...(role === 'admin' ? { adminNotice: typeof settings.notice === 'string' ? settings.notice : '' } : {})
  };
});

exports.saveDeveloperWorkspaceSettings = onCall({ region: 'us-central1' }, async request => {
  await requireAdmin(request);
  const submitted = request.data?.adminSections;
  if (!submitted || Object.keys(adminDefaults).some(key => typeof submitted[key] !== 'boolean')) {
    throw new HttpsError('invalid-argument', 'Choose an access setting for each section.');
  }
  const adminSections = Object.fromEntries(Object.keys(adminDefaults).map(key => [key, submitted[key]]));
  const notice = request.data?.notice;
  if (typeof notice !== 'string' || notice.length > 500) {
    throw new HttpsError('invalid-argument', 'Workspace notices can contain up to 500 characters.');
  }
  await workspaceRef().set({ adminSections, notice: notice.trim() }, { merge: true });
  return { adminSections };
});

async function queryWorkspaceBilling() {
  const table = process.env.CARE_BILLING_EXPORT_TABLE?.trim();
  if (!table) return { status: 'not-configured' };
  const validTable = /^([a-z][a-z0-9-]{4,62})\.[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/;
  if (!validTable.test(table) || !projectId) {
    throw new Error('Invalid billing export configuration');
  }

  const client = await billingAuth.getClient();
  const response = await client.request({
    url: `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/queries`,
    method: 'POST',
    data: {
      query: [
        'SELECT currency, CAST(SUM(cost) AS STRING) AS gross,',
        'CAST(SUM(COALESCE((SELECT SUM(credit.amount) FROM UNNEST(credits) AS credit), 0)) AS STRING) AS credits,',
        'CAST(MAX(export_time) AS STRING) AS latest_export',
        `FROM \`${table}\``,
        'WHERE project.id = @careProject',
        "AND usage_start_time >= TIMESTAMP(DATE_TRUNC(CURRENT_DATE('America/Los_Angeles'), MONTH), 'America/Los_Angeles')",
        'AND usage_start_time <= CURRENT_TIMESTAMP() GROUP BY currency'
      ].join(' '),
      useLegacySql: false,
      timeoutMs: 10000,
      maximumBytesBilled: '1073741824',
      ...(process.env.CARE_BILLING_EXPORT_LOCATION ? { location: process.env.CARE_BILLING_EXPORT_LOCATION } : {}),
      parameterMode: 'NAMED',
      queryParameters: [{
        name: 'careProject',
        parameterType: { type: 'STRING' },
        parameterValue: { value: projectId }
      }]
    }
  });
  if (!response.data.jobComplete || response.data.errors?.length) throw new Error('Billing query incomplete');
  return {
    status: 'available',
    totals: (response.data.rows || []).map(row => {
      const [currency, gross, credits, latestExport] = row.f.map(cell => cell.v);
      return { currency, gross: Number(gross), credits: Number(credits), latestExport };
    })
  };
}

async function fetchWorkspaceBilling() {
  if (billingCache && Date.now() < billingCache.expires) return billingCache.value;
  if (!billingRequest) {
    billingRequest = queryWorkspaceBilling().then(value => {
      if (value.status === 'available') billingCache = { value, expires: Date.now() + 5 * 60 * 1000 };
      return value;
    }).finally(() => { billingRequest = null; });
  }
  return billingRequest;
}

exports.getDeveloperWorkspaceMetrics = onCall({ region: 'us-central1' }, async request => {
  const role = await requireDeveloperWorkspaceRole(request);
  const settings = (await workspaceRef().get()).data() || {};
  const sections = workspaceSections(role, settings);
  const result = {};
  await Promise.all([
    sections.usage && request.data?.usage === true ? fetchFirestoreUsage().then(value => {
      result.usage = value;
    }).catch(() => { result.usage = { error: 'Cloud Monitoring metrics are unavailable. Check the Monitoring API and service account access.' }; }) : null,
    sections.billing && request.data?.billing === true ? fetchWorkspaceBilling().then(value => {
      result.billing = value;
    }).catch(error => {
      logger.warn('Care billing export unavailable', { status: error?.response?.status, code: error?.code });
      result.billing = { status: 'unavailable' };
    }) : null
  ]);
  return result;
});

function registrationRef(db, uid) {
  return db.collection('registration_requests').doc(uid);
}

exports.getCareAccess = onCall({ region: 'us-central1' }, async request => {
  const { db, profile } = await careProfile(request);
  if (profile) return { status: 'approved' };
  const registration = await registrationRef(db, request.auth.uid).get();
  const status = registration.data()?.status;
  return { status: status === 'approved' ? 'unavailable' : status || 'unregistered' };
});

exports.requestCareAccess = onCall({ region: 'us-central1' }, async request => {
  const { db, key, profile } = await careProfile(request);
  if (profile) return { status: 'approved' };
  const { token, uid } = request.auth;
  const isEmail = typeof token.email === 'string';
  if (isEmail && token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email address before requesting access.');
  }
  if (!isEmail && !/^\+91[6-9]\d{9}$/.test(token.phone_number || '')) {
    throw new HttpsError('failed-precondition', 'Verify your Indian mobile number before requesting access.');
  }
  const name = typeof request.data?.name === 'string' ? request.data.name.trim() : '';
  if (name.length < 2 || name.length > 100) throw new HttpsError('invalid-argument', 'Enter your full name (2–100 characters).');
  const ref = registrationRef(db, uid);
  return db.runTransaction(async transaction => {
    const existing = await transaction.get(ref);
    if (existing.exists) return { status: existing.data().status };
    transaction.create(ref, {
      key, uid, name,
      email: isEmail ? key : '',
      phone: /^\+91[6-9]\d{9}$/.test(token.phone_number || '') ? token.phone_number : '',
      status: 'pending',
      requestedAt: new Date()
    });
    return { status: 'pending' };
  });
});

exports.listCareAccessRequests = onCall({ region: 'us-central1' }, async request => {
  await requireDeveloperWorkspaceRole(request);
  const db = getFirestore();
  const [registration, branches] = await Promise.all([
    db.collection('registration_requests').where('status', '==', 'pending').limit(50).get(),
    db.collection('branches').get()
  ]);
  return {
    requests: registration.docs.map(item => {
      const { name, email, phone, requestedAt } = item.data();
      return { id: item.id, name, email, phone, requestedAt: requestedAt.toDate().toISOString() };
    }).sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)),
    branches: [...new Set(branches.docs.map(item => item.data().name).filter(name => typeof name === 'string' && name.trim()))].sort()
  };
});

exports.reviewCareAccess = onCall({ region: 'us-central1' }, async request => {
  await requireDeveloperWorkspaceRole(request);
  const { id, decision, branch } = request.data || {};
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id) || !['approved', 'rejected'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'Select a valid registration and decision.');
  }
  const db = getFirestore();
  const ref = registrationRef(db, id);
  let branchRef;
  let identity;
  if (decision === 'approved') {
    if (typeof branch !== 'string' || !branch.trim()) throw new HttpsError('invalid-argument', 'Choose a clinic branch.');
    const branches = await db.collection('branches').where('name', '==', branch).limit(1).get();
    if (branches.empty) throw new HttpsError('failed-precondition', 'That clinic branch is unavailable.');
    branchRef = branches.docs[0].ref;
    identity = await getAuth().getUser(id);
  }
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.data().status !== 'pending') {
      throw new HttpsError('failed-precondition', 'This request has already been reviewed or is unavailable.');
    }
    const data = snapshot.data();
    if (decision === 'approved') {
      const validIdentity = !identity.disabled && (data.email
        ? identity.emailVerified && identity.email?.toLowerCase() === data.email
        : identity.phoneNumber === data.phone && /^\+91[6-9]\d{9}$/.test(data.phone));
      if (!validIdentity) throw new HttpsError('failed-precondition', 'The verified sign-in identity changed. Contact the applicant.');
      const branchSnapshot = await transaction.get(branchRef);
      if (branchSnapshot.data()?.name !== branch) throw new HttpsError('failed-precondition', 'The clinic branch changed. Refresh the list.');
      const profileRef = db.doc(`users/${data.email || `phone_${id}`}`);
      if ((await transaction.get(profileRef)).exists) {
        throw new HttpsError('already-exists', 'A Care profile already exists. An admin must resolve the conflict.');
      }
      transaction.create(profileRef, {
        authUid: id, role: 'user', branch, name: data.name, ...(data.phone ? { phone: data.phone } : {}), updatedAt: new Date()
      });
    }
    transaction.update(ref, { status: decision, reviewedAt: new Date(), reviewedBy: request.auth.uid });
    return { status: decision };
  });
});

const { defineSecret } = require('firebase-functions/params');
const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');

exports.manageRazorpayPayments = onCall({
  region: 'us-central1',
  secrets: [razorpayKeyId, razorpayKeySecret]
}, async request => {
  await requireAdmin(request);
  const { kind, action, amount, description, id, skip = 0 } = request.data || {};
  if (!['link', 'qr'].includes(kind)) throw new HttpsError('invalid-argument', 'Choose a payment link or UPI QR.');
  const isLink = kind === 'link';
  const collectionPath = isLink ? 'payment_links' : 'payments/qr_codes';
  let path = collectionPath;
  let payload;

  if (action === 'create') {
    if (!Number.isSafeInteger(amount) || amount < 100) {
      throw new HttpsError('invalid-argument', 'Enter a valid amount of at least ₹1.');
    }
    const label = typeof description === 'string' ? description.trim() : '';
    if (!label || label.length > 80) throw new HttpsError('invalid-argument', 'Enter a description of up to 80 characters.');
    payload = isLink
      ? { amount, currency: 'INR', description: label, accept_partial: false, notify: { sms: false, email: false }, reminder_enable: false }
      : { type: 'upi_qr', name: 'STRA CARE', usage: 'single_use', fixed_amount: true, payment_amount: amount, description: label };
  } else if (action === 'close') {
    const validId = isLink ? /^plink_[a-zA-Z0-9]+$/ : /^qr_[a-zA-Z0-9]+$/;
    if (typeof id !== 'string' || !validId.test(id)) throw new HttpsError('invalid-argument', 'Invalid payment reference.');
    path += `/${id}/${isLink ? 'cancel' : 'close'}`;
  } else if (action === 'list') {
    if (!Number.isSafeInteger(skip) || skip < 0) throw new HttpsError('invalid-argument', 'Invalid page.');
    path += `?count=20&skip=${skip}`;
  } else {
    throw new HttpsError('invalid-argument', 'Unsupported payment operation.');
  }

  const keyId = razorpayKeyId.value().trim();
  const keySecret = razorpayKeySecret.value().trim();
  if (!keyId || !keySecret) throw new HttpsError('failed-precondition', 'Razorpay credentials are missing.');
  let response;
  let data;
  try {
    response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      method: action === 'list' ? 'GET' : 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(12000)
    });
    data = await response.json();
  } catch {
    throw new HttpsError('unavailable', action === 'list' ? 'Razorpay is unavailable. Try refreshing.' :
      'Razorpay did not confirm the result. Refresh the list before retrying.');
  }
  if (!response.ok) {
    logger.warn('Razorpay API rejected request', { action, kind, status: response.status, code: data.error?.code });
    throw new HttpsError('failed-precondition', response.status === 401
      ? 'Razorpay rejected the configured credentials.'
      : String(data.error?.description || 'Razorpay rejected the request.').slice(0, 240));
  }

  const summarize = item => ({
    id: item.id,
    description: item.description || '',
    amount: isLink ? item.amount : item.payment_amount,
    received: isLink ? item.amount_paid : item.payments_amount_received,
    status: item.status,
    url: isLink ? item.short_url : item.image_url,
    created: item.created_at
  });
  return {
    mode: keyId.startsWith('rzp_test_') ? 'Test' : 'Live',
    items: (action === 'list' ? (data.payment_links || data.items || []) : [data]).map(summarize)
  };
});
