import {HttpsError} from 'firebase-functions/v2/https';
export async function requireRole(req,db,allowed){if(!req.auth)throw new HttpsError('unauthenticated','Sign in is required');const user=await db.collection('users').doc(req.auth.uid).get();if(!user.exists||user.data().status!=='active'||!allowed.includes(user.data().role))throw new HttpsError('permission-denied','Not authorized');return {...user.data(),uid:req.auth.uid}}
export function allowedBranch(user,branchId){return ['super_admin','admin'].includes(user.role)||user.branchIds?.includes(branchId)}
