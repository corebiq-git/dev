import {signInWithEmailAndPassword,signOut,onAuthStateChanged} from 'firebase/auth';
import {collection,query,where,orderBy,limit,getDocs,doc,getDoc} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {auth,db,functions} from '../config/firebase.js';
export const signIn=(email,password)=>signInWithEmailAndPassword(auth,email,password);
export const logOut=()=>signOut(auth);
export const watchAuth=(fn)=>onAuthStateChanged(auth,fn);
export async function getMyAccess(uid){
  const snap=await getDoc(doc(db,'users',uid));
  return snap.exists()?{uid,...snap.data()}:null;
}
export async function recent(collectionName,user){
  if(!['branches','staff','patients','services','appointments'].includes(collectionName))
    throw new Error('Unsupported collection');
  if(!user||user.status!=='active')throw new Error('Active account required');
  const global=['super_admin','admin'].includes(user.role);
  const base=collection(db,collectionName);
  if(global||collectionName==='services'){
    const snap=await getDocs(query(base,orderBy('createdAt','desc'),limit(50)));
    return snap.docs.map(x=>({id:x.id,...x.data()}));
  }
  // Clinicians do not get bulk patient lists without purpose-specific authorization.
  if(collectionName==='patients'&&user.role==='physiotherapist')return [];
  if(collectionName==='appointments'&&user.role==='physiotherapist'){
    const ids=Array.isArray(user.staffIds)?user.staffIds:[];
    if(!ids.length)return [];
    const pages=await Promise.all(ids.map(id=>getDocs(query(base,where('staffId','==',id),orderBy('createdAt','desc'),limit(50)))));
    return merge(pages);
  }
  const branchIds=Array.isArray(user.branchIds)?user.branchIds:[];
  if(!branchIds.length)return [];
  // Each query is constrained so Firestore does not need to scan other branches.
  const pages=await Promise.all(branchIds.map(id=>collectionName==='branches'
    ?getDoc(doc(db,'branches',id))
    :getDocs(query(base,where('branchId','==',id),orderBy('createdAt','desc'),limit(50)))));
  if(collectionName==='branches')return pages.filter(p=>p.exists()).map(p=>({id:p.id,...p.data()}));
  return merge(pages);
}
function merge(snapshots){
  const map=new Map();
  for(const result of snapshots)for(const d of result.docs)map.set(d.id,{id:d.id,...d.data()});
  return [...map.values()].sort((a,b)=>(b.createdAt?.seconds??0)-(a.createdAt?.seconds??0)).slice(0,50);
}
export async function createRecord(type,payload){
  const result=await httpsCallable(functions,'createRecord')({type,payload});return result.data;
}
export async function createAppointment(payload){
  const result=await httpsCallable(functions,'bookAppointment')(payload);return result.data;
}
export async function assignRole(payload){
  const result=await httpsCallable(functions,'assignRole')(payload);return result.data;
}
