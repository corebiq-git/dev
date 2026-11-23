import {initializeApp} from 'firebase-admin/app';import {getFirestore,FieldValue,Timestamp} from 'firebase-admin/firestore';import {getAuth} from 'firebase-admin/auth';import {onCall,HttpsError} from 'firebase-functions/v2/https';import {z} from 'zod';import {nextId} from './ids.js';import {requireRole,allowedBranch} from './auth.js';import {slotKeys} from './slots.js';
initializeApp();const db=getFirestore();const options={region:'asia-south1',enforceAppCheck:true,maxInstances:20};
const branch=z.object({name:z.string().trim().min(2).max(120),code:z.string().trim().min(2).max(20),address:z.string().trim().min(3).max(500),phone:z.string().min(7).max(20),email:z.string().email()}).strict();
const staff=z.object({name:z.string().trim().min(2),email:z.string().email(),designation:z.string().min(2),branchId:z.string().min(1)}).strict();
const patient=z.object({fullName:z.string().trim().min(2).max(120),mobile:z.string().regex(/^\+?[0-9 -]{8,18}$/),dob:z.string().optional().default(''),branchId:z.string().min(1),consent:z.literal(true)}).strict();
const service=z.object({name:z.string().trim().min(2),category:z.string().min(1),durationMinutes:z.number().int().min(5).max(480),standardPrice:z.number().min(0).max(10000000)}).strict();
const defs={branches:{schema:branch,roles:['super_admin','admin']},staff:{schema:staff,roles:['super_admin','admin']},patients:{schema:patient,roles:['super_admin','admin','branch_manager','receptionist']},services:{schema:service,roles:['super_admin','admin']}};
export const createRecord=onCall(options,async req=>{const type=req.data?.type;const def=defs[type];if(!def)throw new HttpsError('invalid-argument','Unsupported module');const actor=await requireRole(req,db,def.roles);const parsed=def.schema.safeParse(req.data?.payload);if(!parsed.success)throw new HttpsError('invalid-argument',parsed.error.issues[0].message);const data=parsed.data;if(data.branchId&&!allowedBranch(actor,data.branchId))throw new HttpsError('permission-denied','Branch access denied');if(type==='staff'||type==='patients'){const exists=await db.collection('branches').doc(data.branchId).get();if(!exists.exists||exists.data().status!=='active')throw new HttpsError('failed-precondition','Branch not active')};const ref=db.collection(type).doc();let businessId;await db.runTransaction(async tx=>{businessId=await nextId(tx,db,type);tx.create(ref,{...data,documentId:ref.id,businessId,businessReferenceId:null,branchId:data.branchId||null,status:'active',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),createdBy:actor.uid,updatedBy:actor.uid});const audit=db.collection('auditLogs').doc();tx.create(audit,{action:'create',module:type,recordId:ref.id,actorUid:actor.uid,createdAt:FieldValue.serverTimestamp()})});return {id:ref.id,businessId}});
const booking=z.object({patientId:z.string().min(1),serviceId:z.string().min(1),staffId:z.string().min(1),branchId:z.string().min(1),startAt:z.string().datetime()}).strict();
export const bookAppointment=onCall(options,async req=>{const actor=await requireRole(req,db,['super_admin','admin','branch_manager','receptionist']);const parsed=booking.safeParse(req.data);if(!parsed.success)throw new HttpsError('invalid-argument','Invalid appointment');const d=parsed.data;if(!allowedBranch(actor,d.branchId))throw new HttpsError('permission-denied','Branch access denied');const start=new Date(d.startAt);if(start.getTime()<Date.now()||start.getTime()>Date.now()+365*86400000)throw new HttpsError('invalid-argument','Date outside permitted range');const [p,s,t,b]=await Promise.all([db.collection('patients').doc(d.patientId).get(),db.collection('services').doc(d.serviceId).get(),db.collection('staff').doc(d.staffId).get(),db.collection('branches').doc(d.branchId).get()]);if(!p.exists||!s.exists||!t.exists||!b.exists||p.data().branchId!==d.branchId||t.data().branchId!==d.branchId||!Number.isInteger(s.data().durationMinutes))throw new HttpsError('failed-precondition','Invalid patient, service, staff or branch');if([p,s,t,b].some(x=>x.data().status!=='active'))throw new HttpsError('failed-precondition','Inactive booking entity');const duration=s.data().durationMinutes;// Use deterministic 5-minute occupancy documents for both staff and patient.
const end=new Date(start.getTime()+duration*60000);
let keys;try{keys=slotKeys({staffId:d.staffId,patientId:d.patientId,start,durationMinutes:duration})}
catch(e){throw new HttpsError('invalid-argument',e.message)}
const lockRefs=keys.map(key=>db.collection('appointmentLocks').doc(key));
const ref=db.collection('appointments').doc();let businessId;
await db.runTransaction(async tx=>{
  // A read of every time-cell precedes every write. Concurrent overlapping
  // requests race on the same lock document and at most one can commit.
  const existing=await tx.getAll(...lockRefs);
  if(existing.some(x=>x.exists))throw new HttpsError('already-exists','Staff or patient has an overlapping appointment');
  businessId=await nextId(tx,db,'appointments');
  for(const lock of lockRefs)tx.create(lock,{
    appointmentId:ref.id,staffId:d.staffId,patientId:d.patientId,
    createdAt:FieldValue.serverTimestamp()
  });
  tx.create(ref,{
    ...d,startAt:Timestamp.fromDate(start),endAt:Timestamp.fromDate(end),
    durationMinutes:duration,documentId:ref.id,businessId,
    businessReferenceId:null,status:'pending',createdAt:FieldValue.serverTimestamp(),
    updatedAt:FieldValue.serverTimestamp(),createdBy:actor.uid,updatedBy:actor.uid
  });
  tx.create(db.collection('auditLogs').doc(),{
    action:'create',module:'appointments',recordId:ref.id,
    actorUid:actor.uid,createdAt:FieldValue.serverTimestamp()
  });
});return {id:ref.id,businessId}});
export const assignRole=onCall(options,async req=>{const actor=await requireRole(req,db,['super_admin']);const {uid,role,branchIds=[]}=req.data||{};const roles=['super_admin','developer','admin','branch_manager','physiotherapist','receptionist','accountant','support_staff'];if(typeof uid!=='string'||!roles.includes(role)||!Array.isArray(branchIds)||branchIds.some(x=>typeof x!=='string'))throw new HttpsError('invalid-argument','Invalid role assignment');await getAuth().getUser(uid);await getAuth().setCustomUserClaims(uid,{role});await db.collection('users').doc(uid).set({role,branchIds,status:'active',updatedAt:FieldValue.serverTimestamp(),updatedBy:actor.uid},{merge:true});await db.collection('auditLogs').add({action:'assign_role',actorUid:actor.uid,targetUid:uid,role,createdAt:FieldValue.serverTimestamp()});return {ok:true}});
