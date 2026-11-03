import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, ADMIN_UID } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Module definition is the only area intended for module-by-module changes.
const MODULES = [
  { label:"Dashboard", collection:"dashboard", icon:"▦", fields:[{key:"title",label:"Title",required:true},{key:"notes",label:"Notes",type:"textarea"}] },
  { label:"Inventory", collection:"inventory", icon:"▣", fields:[{key:"name",label:"Item name",required:true},{key:"sku",label:"SKU"},{key:"quantity",label:"Quantity",type:"number"},{key:"status",label:"Status",type:"select",options:["Active","Inactive"]}] },
  { label:"CRM", collection:"customers", icon:"♙", fields:[{key:"name",label:"Customer name",required:true},{key:"email",label:"Email",type:"email"},{key:"phone",label:"Phone"},{key:"status",label:"Status",type:"select",options:["Active","Inactive"]}] },
  { label:"Accounts", collection:"accounts", icon:"₹", fields:[{key:"name",label:"Account / party name",required:true},{key:"reference",label:"Reference number"},{key:"amount",label:"Amount",type:"number"},{key:"status",label:"Status",type:"select",options:["Pending","Paid","Cancelled"]}] },
  { label:"HR", collection:"employees", icon:"♧", fields:[{key:"name",label:"Employee name",required:true},{key:"email",label:"Email",type:"email"},{key:"department",label:"Department"},{key:"status",label:"Status",type:"select",options:["Active","Inactive"]}] },
  { label:"Report", collection:"reports", icon:"▤", fields:[{key:"name",label:"Report name",required:true},{key:"period",label:"Period"},{key:"notes",label:"Notes",type:"textarea"}] },
  { label:"Data Import & Export", collection:"dataTransfers", icon:"⇅", fields:[{key:"name",label:"Transfer name",required:true},{key:"type",label:"Type",type:"select",options:["Import","Export"]},{key:"notes",label:"Notes",type:"textarea"}] },
  { label:"GST", collection:"gstRecords", icon:"▧", fields:[{key:"name",label:"GST record",required:true},{key:"gstin",label:"GSTIN"},{key:"period",label:"Return period"},{key:"status",label:"Status",type:"select",options:["Pending","Filed"]}] },
  { label:"Tools", collection:"tools", icon:"⚙", fields:[{key:"name",label:"Tool name",required:true},{key:"description",label:"Description",type:"textarea"}] },
  { label:"Templates", collection:"templates", icon:"▧", fields:[{key:"name",label:"Template name",required:true},{key:"category",label:"Category"},{key:"notes",label:"Notes",type:"textarea"}] },
  { label:"App Info", collection:"appInfo", icon:"ⓘ", fields:[{key:"name",label:"Information title",required:true},{key:"value",label:"Value",type:"textarea"}] },
  { label:"Settings", collection:"settings", icon:"⚙", fields:[{key:"name",label:"Setting name",required:true},{key:"value",label:"Value",type:"textarea"}] },
  { label:"More", collection:"more", icon:"•••", fields:[{key:"name",label:"Name",required:true},{key:"notes",label:"Notes",type:"textarea"}] }
];

let activeModule = MODULES[0];
let records = [];
let editingId = null;

const $ = id => document.getElementById(id);
const loginPanel = $("loginPanel"), appShell = $("app");
const message = (el, text) => { el.textContent = text || ""; };

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  message($("loginMessage"), "");
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (error) {
    message($("loginMessage"), "Sign in failed: " + error.message);
  }
});
$("logoutBtn").addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, async user => {
  if (!user) {
    loginPanel.hidden = false; appShell.hidden = true;
    return;
  }
  if (user.uid !== ADMIN_UID) {
    await signOut(auth);
    message($("loginMessage"), "This account is not authorized as COREBIQ admin.");
    loginPanel.hidden = false; appShell.hidden = true;
    return;
  }
  loginPanel.hidden = true; appShell.hidden = false;
  $("adminEmail").textContent = user.email || "Admin";
  renderNavigation();
  await loadRecords();
});

function renderNavigation() {
  $("moduleNav").replaceChildren();
  MODULES.forEach(module => {
    const button = document.createElement("button");
    button.type = "button"; button.textContent = `${module.icon}  ${module.label}`;
    button.classList.toggle("active", module === activeModule);
    button.addEventListener("click", async () => {
      activeModule = module;
      renderNavigation();
      await loadRecords();
    });
    $("moduleNav").append(button);
  });
  $("moduleTitle").textContent = activeModule.label;
  $("breadcrumb").textContent = `Modules / ${activeModule.label}`;
  $("moduleDescription").textContent = `Manage ${activeModule.label.toLowerCase()} records.`;
  $("addBtn").textContent = `+ Add ${activeModule.label === "CRM" ? "customer" : "record"}`;
}
async function loadRecords() {
  $("tableBody").replaceChildren();
  $("tableHead").replaceChildren();
  try {
    const snap = await getDocs(query(collection(db, activeModule.collection), orderBy("createdAt","desc")));
    records = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch (error) {
    // Empty collections may not yet have createdAt; retry a plain collection read.
    try {
      const snap = await getDocs(collection(db, activeModule.collection));
      records = snap.docs.map(d => ({id:d.id,...d.data()}));
    } catch (err) {
      records = [];
      alert("Could not load records. Verify Firebase config, admin UID and Firestore rules. " + err.message);
    }
  }
  renderTable();
}
function renderTable() {
  const columns = activeModule.fields;
  const head = document.createElement("tr");
  [...columns.map(f=>f.label), "Created", "Actions"].forEach(label => {
    const th = document.createElement("th"); th.textContent = label; head.append(th);
  });
  $("tableHead").append(head);
  const term = $("searchInput").value.trim().toLowerCase();
  const filtered = records.filter(row => columns.some(f => String(row[f.key] ?? "").toLowerCase().includes(term)));
  $("tableBody").replaceChildren();
  filtered.forEach(row => {
    const tr = document.createElement("tr");
    columns.forEach(field => {
      const td = document.createElement("td"); td.textContent = row[field.key] ?? "—"; tr.append(td);
    });
    const created = document.createElement("td");
    created.textContent = row.createdAt?.toDate ? row.createdAt.toDate().toLocaleDateString("en-IN") : "—";
    tr.append(created);
    const actions = document.createElement("td"), wrap = document.createElement("div"); wrap.className = "row-actions";
    const edit = document.createElement("button"); edit.textContent = "Edit"; edit.addEventListener("click",()=>openForm(row));
    const del = document.createElement("button"); del.textContent = "Delete"; del.className="delete"; del.addEventListener("click",()=>removeRecord(row));
    wrap.append(edit,del); actions.append(wrap); tr.append(actions); $("tableBody").append(tr);
  });
  $("emptyState").hidden = filtered.length !== 0;
  $("stats").innerHTML = "";
  const cards = [
    ["Total records",records.length],
    ["Active",records.filter(r=>String(r.status||"").toLowerCase()==="active").length],
    ["Created this view",records.length],
    ["Search results",filtered.length]
  ];
  cards.forEach(([label,value])=>{
    const card=document.createElement("div");card.className="stat";
    const l=document.createElement("label");l.textContent=label;
    const v=document.createElement("strong");v.textContent=value;
    card.append(l,v);$("stats").append(card);
  });
}
$("searchInput").addEventListener("input",renderTable);
$("addBtn").addEventListener("click",()=>openForm());
$("closeDialog").addEventListener("click",()=> $("recordDialog").close());
$("cancelBtn").addEventListener("click",()=> $("recordDialog").close());

function openForm(record=null) {
  editingId=record?.id || null;
  $("dialogTitle").textContent=editingId ? "Edit record" : "Add record";
  $("formFields").replaceChildren(); message($("formMessage"),"");
  activeModule.fields.forEach(field=>{
    const wrap=document.createElement("div");wrap.className="field"+(field.type==="textarea"?" full":"");
    const label=document.createElement("label");label.textContent=field.label;label.htmlFor="field_"+field.key;
    let input;
    if(field.type==="textarea"){input=document.createElement("textarea");input.rows=3;input.style.cssText="width:100%;border:1px solid #c4c7c5;border-radius:8px;padding:10px;font:inherit";}
    else if(field.type==="select"){input=document.createElement("select");field.options.forEach(opt=>{const o=document.createElement("option");o.value=opt;o.textContent=opt;input.append(o);});}
    else {input=document.createElement("input");input.type=field.type||"text";}
    input.id="field_"+field.key;input.name=field.key;input.required=!!field.required;
    input.value=record?.[field.key] ?? "";
    wrap.append(label,input);$("formFields").append(wrap);
  });
  $("recordDialog").showModal();
}
$("recordForm").addEventListener("submit",async event=>{
  event.preventDefault();message($("formMessage"),"");
  const data={};
  activeModule.fields.forEach(field=>{
    const input=$("field_"+field.key);
    data[field.key]=field.type==="number" ? (input.value===""?null:Number(input.value)) : input.value.trim();
  });
  try{
    if(editingId) await updateDoc(doc(db,activeModule.collection,editingId),{...data,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.uid});
    else await addDoc(collection(db,activeModule.collection),{...data,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid,updatedAt:serverTimestamp()});
    $("recordDialog").close();await loadRecords();
  }catch(error){message($("formMessage"),"Save failed: "+error.message);}
});
async function removeRecord(record){
  if(!confirm("Delete this record permanently?"))return;
  try{await deleteDoc(doc(db,activeModule.collection,record.id));await loadRecords();}
  catch(error){alert("Delete failed: "+error.message);}
}
