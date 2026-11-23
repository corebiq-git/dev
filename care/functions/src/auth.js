import {HttpsError} from 'firebase-functions/v2/https';
export async function requireRole(req,db,allowed){
  if(!req.auth)throw new HttpsError('unauthenticated','Sign in is required');
  const user=await db.collection('users').doc(req.auth.uid).get();
  const info=user.data();
  // Both the Firebase-signed claim and the protected Firestore profile must agree.
  if(!user.exists||info.status!=='active'||!allowed.includes(info.role)||req.auth.token.role!==info.role)
    throw new HttpsError('permission-denied','Not authorized');
  return {...info,uid:req.auth.uid};
}
export function allowedBranch(user,branchId){
  return ['super_admin','admin'].includes(user.role)||(Array.isArray(user.branchIds)&&user.branchIds.includes(branchId));
}
