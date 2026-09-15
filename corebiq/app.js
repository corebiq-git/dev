import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

window.CorBIQ = { app, auth, db, storage };

const titles = {
 dashboard:"Dashboard", company:"Company Setup", bank:"Bank & Cheque Book",
 crm:"CRM & Clients", accounts:"Accounts", compliance:"Compliance",
 projects:"Projects", employee:"Employee & Payroll", appointment:"Appointments",
 data:"Data Management", templates:"Templates", reports:"Reports",
 integration:"BIQ Integration", documents:"Documents", profile:"User Profile",
 more:"Settings & More", ai:"CorBIQ AI Assistant"
};

const nav = [
 ["dashboard","space_dashboard","Dashboard"],
 ["company","business","Company"],
 ["bank","account_balance","Bank"],
 ["crm","groups","CRM"],
 ["accounts","receipt_long","Accounts"],
 ["compliance","rule","Compliance"],
 ["projects","workspaces","Projects"],
 ["employee","badge","Employee"],
 ["appointment","event","Appointment"],
 ["data","database","Data"],
 ["templates","description","Templates"],
 ["reports","analytics","Reports"],
 ["integration","extension","BIQ Integration"],
 ["documents","folder","Documents"],
 ["profile","manage_accounts","User Profile"],
 ["ai","smart_toy","CorBIQ AI"],
 ["more","settings","More"]
];

function shell() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  sidebar.innerHTML = `
    <div class="p-6 flex items-center gap-3 border-b border-slate-200">
      <div class="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white"><span class="material-symbols-rounded">hub</span></div>
      <div><div class="text-xl font-bold">CorBIQ</div><div class="text-[10px] text-primary font-semibold tracking-widest">ERP • CRM</div></div>
    </div>
    <div class="p-4"><div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
      <p class="text-xs text-onSurfaceVariant">Active Company</p><p class="font-semibold text-sm truncate">Your Company</p><p class="text-xs text-primary mt-1">BIQ-001</p>
    </div></div>
    <nav class="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1 pb-4">
      ${nav.map(([id,icon,label])=>`<a href="${id==="dashboard"?"index.html":id+".html"}" data-module="${id}" class="nav-item w-full flex items-center gap-4 px-4 py-3 rounded-full text-onSurfaceVariant hover:bg-slate-200/50 transition-colors text-sm font-medium">
        <span class="material-symbols-rounded nav-icon px-3 py-1 -ml-3">${icon}</span>${label}</a>`).join("")}
    </nav>
    <div class="p-4 border-t border-slate-200"><button id="logoutBtn" class="w-full flex items-center gap-3 px-4 py-3 rounded-full text-error hover:bg-red-50 text-sm font-medium"><span class="material-symbols-rounded">logout</span> Sign Out</button></div>`;
  document.getElementById("logoutBtn")?.addEventListener("click", async()=>{ try{await signOut(auth)}catch{}; location.href="index.html"; });
}

function mobileNav(){
  const n=document.getElementById("mobile-nav"); if(!n)return;
  n.innerHTML=`${["dashboard","crm","accounts","documents"].map(id=>{
    const x=nav.find(a=>a[0]===id);
    return `<a href="${id==="dashboard"?"index.html":id+".html"}" class="nav-item flex flex-col items-center justify-center w-16 h-14 touch-target"><span class="material-symbols-rounded nav-icon px-4 py-0.5 mb-1">${x[1]}</span><span class="text-[10px] font-medium">${x[2]}</span></a>`;
  }).join("")}<button id="mobileMenuBtn" class="nav-item flex flex-col items-center justify-center w-16 h-14 touch-target"><span class="material-symbols-rounded nav-icon px-4 py-0.5 mb-1">menu</span><span class="text-[10px] font-medium">Menu</span></button>`;
  document.getElementById("mobileMenuBtn")?.addEventListener("click",()=>document.getElementById("mobile-drawer")?.classList.remove("-translate-x-full"));
}

function topbar(){
 const t=document.getElementById("header-title"); if(t)t.textContent=titles[document.body.dataset.module]||"CorBIQ";
 const menu=document.getElementById("mobile-drawer");
 if(menu)menu.innerHTML=`<div class="p-6 bg-[#f0f4f9] flex justify-between items-center"><div class="flex gap-3 items-center"><img src="assets/logo-192.png" class="w-10 h-10 rounded-xl"><div><b>CorBIQ</b><p class="text-xs text-onSurfaceVariant">ERP & CRM</p></div></div><button id="closeDrawer"><span class="material-symbols-rounded">close</span></button></div>
 <div class="flex-1 overflow-auto p-4">${nav.map(([id,icon,label])=>`<a href="${id==="dashboard"?"index.html":id+".html"}" class="flex items-center gap-4 px-4 py-3 rounded-full hover:bg-slate-100 text-sm"><span class="material-symbols-rounded">${icon}</span>${label}</a>`).join("")}</div>`;
 document.getElementById("closeDrawer")?.addEventListener("click",()=>menu.classList.add("-translate-x-full"));
}

function markActive(){
 const current=document.body.dataset.module;
 document.querySelectorAll("[data-module]").forEach(a=>a.classList.toggle("active",a.dataset.module===current));
}

function toast(msg){
 const e=document.getElementById("toast"); if(!e)return;
 e.textContent=msg;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2600);
}

async function saveRecord(module, form){
 const fd=new FormData(form); const data=Object.fromEntries(fd.entries());
 data.module=module; data.updatedAt=new Date().toISOString();
 try{
   if(auth.currentUser) data.userId=auth.currentUser.uid;
   await addDoc(collection(db, "erpRecords"), data);
   toast("Saved successfully");
   form.reset();
 }catch(e){ console.error(e); toast("Save failed — check Firebase configuration"); }
}

function attachForms(){
 document.querySelectorAll("form[data-module-form]").forEach(form=>{
   form.addEventListener("submit",e=>{
     e.preventDefault();
     if(!form.checkValidity()){form.reportValidity();return}
     saveRecord(form.dataset.moduleForm,form);
   });
 });
 document.querySelectorAll("[data-back]").forEach(b=>b.addEventListener("click",()=>history.back()));
}

function splash(){
 const s=document.getElementById("splash"); if(!s)return;
 setTimeout(()=>{s.classList.add("opacity-0");setTimeout(()=>s.remove(),500)},900);
}

async function boot(){
 shell(); mobileNav(); topbar(); markActive(); attachForms(); splash();
 onAuthStateChanged(auth,u=>{ if(!u){ signInAnonymously(auth).catch(()=>{}); }});
 if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}
document.addEventListener("DOMContentLoaded",boot);
export { toast };
