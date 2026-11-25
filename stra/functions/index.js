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

async function requireAdmin(request) {
  const email = request.auth?.token.email;
  if (typeof email !== 'string' || !email.trim()) {
    throw new HttpsError('unauthenticated', 'Sign in with an administrator account to manage users.');
  }
  const db = getFirestore();
  const userSnapshot = await db.doc(`users/${email.toLowerCase()}`).get();
  if (!userSnapshot.exists || userSnapshot.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only administrators can manage users.');
  }
  return { db, callerEmail: email.toLowerCase() };
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
  const currentEmail = normalizeEmail(request.data?.currentEmail);
  const email = normalizeEmail(request.data?.email);
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
    batch.set(newProfileRef, { ...existingData, role, branch, updatedAt: new Date() });
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
  const email = normalizeEmail(request.data?.email);
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
    userRecord = await getAuth().getUserByEmail(email);
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in with an administrator account to view usage.');
  }

  const email = request.auth.token.email;
  if (typeof email !== 'string' || !email.trim()) {
    throw new HttpsError('permission-denied', 'An administrator email is required.');
  }

  const userSnapshot = await getFirestore().doc(`users/${email.toLowerCase()}`).get();
  if (!userSnapshot.exists || userSnapshot.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Firestore usage is available to administrators only.');
  }

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
  const email = request.auth?.token.email;
  if (typeof email !== 'string' || !email.trim()) {
    throw new HttpsError('unauthenticated', 'Sign in to open the Developer Workspace.');
  }
  const profile = await getFirestore().doc(`users/${email.trim().toLowerCase()}`).get();
  const role = profile.data()?.role;
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
