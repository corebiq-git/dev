/**
 * ONE-TIME, TRUSTED OPERATOR SCRIPT — NEVER CALL FROM THE BROWSER.
 * Uses Application Default Credentials (ADC); never commit credentials.
 * Requires explicitly verified Firebase Auth email and UID.
 */
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';

const projectId=process.env.COREBIQ_FIREBASE_PROJECT_ID;
const uid=process.env.COREBIQ_BOOTSTRAP_UID;
const email=process.env.COREBIQ_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const confirmation=process.env.COREBIQ_BOOTSTRAP_CONFIRM;
if(!projectId||!uid||!email||confirmation!==`bootstrap:${projectId}:${uid}`){
  throw new Error('Set project, UID, email and exact COREBIQ_BOOTSTRAP_CONFIRM before running.');
}
initializeApp({credential:applicationDefault(),projectId});
const auth=getAuth(),db=getFirestore();
const authUser=await auth.getUser(uid);
if(authUser.disabled||!authUser.emailVerified||authUser.email?.toLowerCase()!==email){
  throw new Error('Firebase Auth account must be enabled, email-verified and match the supplied UID/email.');
}
const existing=await db.collection('users').where('role','==','super_admin').limit(2).get();
if(existing.docs.some(s=>s.id!==uid)){
  throw new Error('Another super admin exists; use the authenticated assignRole Function instead.');
}
await auth.setCustomUserClaims(uid,{role:'super_admin'});
await db.collection('users').doc(uid).set({
  role:'super_admin',branchIds:[],status:'active',
  updatedAt:FieldValue.serverTimestamp(),updatedBy:'trusted-bootstrap',
  createdAt:FieldValue.serverTimestamp(),createdBy:'trusted-bootstrap'
},{merge:true});
await db.collection('auditLogs').add({
  action:'bootstrap_super_admin',actorUid:uid,targetUid:uid,
  createdAt:FieldValue.serverTimestamp()
});
process.stdout.write('Super admin provisioned in project '+projectId+' for UID '+uid+'\n');
