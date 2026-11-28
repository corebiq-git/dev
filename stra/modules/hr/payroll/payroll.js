import {db} from '../../../js/firebase-config.js';
import {collection,getDocs} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
const root=document.getElementById('payroll-module');
if(root && window.currentUser?.role==='admin'){
const el=id=>root.querySelector('#'+id);
let people=[];
const render=()=>{const filter=el('payroll-filter').value;const list=el('payroll-directory');list.replaceChildren();for(const p of people.filter(p=>filter==='all'||p.type===filter)){const row=document.createElement('div');row.className='payroll-person';const name=document.createElement('strong');name.textContent=p.name;const meta=document.createElement('small');meta.textContent=[p.type==='staff'?'Employee':'Therapist',p.branch].filter(Boolean).join(' · ');row.append(name,meta);list.append(row);}};
el('payroll-filter').addEventListener('change',render);
el('payroll-add').onclick=()=>{el('payroll-draft').hidden=false;el('payroll-person').focus();};
el('payroll-close').onclick=()=>{el('payroll-draft').hidden=true;};
el('payroll-month').value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).format(new Date());
const calculate=()=>{const val=id=>Math.max(0,Number(el(id).value)||0);el('payroll-net').textContent=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(val('payroll-basic')+val('payroll-allowance')-val('payroll-deduction'));};
for(const id of ['payroll-basic','payroll-allowance','payroll-deduction'])el(id).addEventListener('input',calculate);
const types=['staff','therapists'];Promise.allSettled(types.map(t=>getDocs(collection(db,t)))).then(results=>{if(!root.isConnected||window.currentUser?.role!=='admin')return;people=results.flatMap((r,i)=>r.status==='fulfilled'?r.value.docs.map(d=>({id:types[i]+':'+d.id,type:types[i],name:String(d.data().name||'Unnamed'),branch:String(d.data().branch||'')})):[]).sort((a,b)=>a.name.localeCompare(b.name));for(const p of people){const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.name+' · '+(p.type==='staff'?'Employee':'Therapist')+(p.branch?' · '+p.branch:'');el('payroll-person').append(opt);}el('payroll-directory-status').textContent=results.some(r=>r.status==='rejected')?'Some directory records could not be loaded.':people.length+' people';render();});
}