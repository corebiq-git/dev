import {signInWithEmailAndPassword,signOut,onAuthStateChanged} from 'firebase/auth';import {collection,query,orderBy,limit,getDocs,doc,getDoc} from 'firebase/firestore';import {httpsCallable} from 'firebase/functions';import {auth,db,functions} from '../config/firebase.js';
export const signIn=(email,password)=>signInWithEmailAndPassword(auth,email,password);
export const logOut=()=>signOut(auth);
export const watchAuth=(fn)=>onAuthStateChanged(auth,fn);
export async function getMyAccess(uid){const snap=await getDoc(doc(db,'users',uid));return snap.exists()?{uid,...snap.data()}:null}
export async function recent(collectionName){const snap=await getDocs(query(collection(db,collectionName),orderBy('createdAt','desc'),limit(50)));return snap.docs.map(x=>({id:x.id,...x.data()}))}
export async function createRecord(type,payload){const result=await httpsCallable(functions,'createRecord')({type,payload});return result.data}
export async function createAppointment(payload){const result=await httpsCallable(functions,'bookAppointment')(payload);return result.data}
export async function assignRole(payload){const result=await httpsCallable(functions,'assignRole')(payload);return result.data}
