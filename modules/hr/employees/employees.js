import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, runTransaction, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const { firebaseConfig } = await import(new URL("firebase/firebase-config.js", document.baseURI));
const ADMIN = "shanicm@gmail.com";
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
const employees = new Map();
let unsubscribe = null;
let editingId = "";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const normalize = (value) => String(value ?? "").trim().toLowerCase();
const money = (value) => {
  const amount = Number(value) || 0;
  let currency = "INR";
  try { currency = localStorage.getItem("corebiq-currency") || "INR"; } catch {}
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
  catch { return `₹${amount.toLocaleString("en-IN")}`; }
};
const today = () => new Date().toISOString().slice(0, 10);
const isPrefillEnabled = () => {
  try { return Boolean(JSON.parse(localStorage.getItem("corebiq-developer-settings") || "{}").access?.hr?.prefill); }
  catch { return false; }
};

function showError(message = "") { $("hr-employees-error").textContent = message; $("hr-employees-error").classList.toggle("hidden", !message); }
function toast(message, success = true) { const node = $("employeeToast"); node.textContent = message; node.style.background = success ? "#166534" : "#b42318"; node.classList.remove("hidden"); setTimeout(() => node.classList.add("hidden"), 3000); }
function formatDate(value) { if (!value) return "—"; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date); }
function nextEmployeeId() {
  const max = [...employees.values()].reduce((highest, employee) => { const match = String(employee.employeeId || "").match(/^EMP-(\d+)$/i); return match ? Math.max(highest, Number(match[1])) : highest; }, 0);
  return runTransaction(db, async (transaction) => {
    const counterRef = doc(db, "settings", "counters");
    const snapshot = await transaction.get(counterRef);
    const stored = Number(snapshot.exists() ? snapshot.data().hrEmployeeSequence : 0) || 0;
    const sequence = Math.max(stored + 1, max + 1);
    transaction.set(counterRef, { hrEmployeeSequence: sequence, updatedAt: serverTimestamp() }, { merge: true });
    return `EMP-${String(sequence).padStart(4, "0")}`;
  });
}

function render() {
  const query = normalize($("employeeSearch").value);
  const status = $("employeeStatusFilter").value;
  const all = [...employees.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }));
  const filtered = all.filter((employee) => {
    const haystack = [employee.employeeId, employee.name, employee.department, employee.role, employee.email, employee.phone].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!status || (employee.status || "Active") === status);
  });
  const active = all.filter((employee) => normalize(employee.status) !== "inactive");
  const departments = new Set(active.map((employee) => String(employee.department || "General").trim()).filter(Boolean));
  $("kpi-total-employees").textContent = all.length.toLocaleString("en-IN");
  $("kpi-active-employees").textContent = active.length.toLocaleString("en-IN");
  $("kpi-departments").textContent = departments.size.toLocaleString("en-IN");
  $("kpi-payroll").textContent = money(active.reduce((total, employee) => total + (Number(employee.monthlySalary) || 0), 0));
  $("employeeCount").textContent = `${filtered.length.toLocaleString("en-IN")} employee${filtered.length === 1 ? "" : "s"}`;
  $("employeeLoading").classList.add("hidden");
  $("employeeEmpty").classList.toggle("hidden", filtered.length > 0);
  $("employeeTableWrap").classList.toggle("hidden", filtered.length === 0);
  $("employeeRows").innerHTML = filtered.map((employee) => {
    const employeeStatus = employee.status || "Active";
    return `<tr>
      <td><div class="employee-main"><strong>${esc(employee.name || "Unnamed employee")}</strong><small>${esc(employee.employeeId || employee.id)} · Joined ${esc(formatDate(employee.joiningDate))}</small></div></td>
      <td>${esc(employee.department || "General")}</td>
      <td>${esc(employee.role || "—")}</td>
      <td><div class="employee-contact">${employee.email ? `<a href="mailto:${esc(employee.email)}">${esc(employee.email)}</a>` : "<small>—</small>"}<small>${esc(employee.phone || "No phone")}</small></div></td>
      <td class="text-right">${esc(money(employee.monthlySalary))}</td>
      <td><span class="employee-status ${normalize(employeeStatus) === "inactive" ? "inactive" : "active"}">${esc(employeeStatus)}</span></td>
      <td><div class="employee-actions"><button type="button" class="btn btn-tonal btn-sm" data-action="edit" data-id="${esc(employee.id)}" aria-label="Edit ${esc(employee.name || "employee")}"><i data-lucide="pencil" aria-hidden="true"></i><span>Edit</span></button><button type="button" class="btn btn-tonal btn-sm" data-action="delete" data-id="${esc(employee.id)}" aria-label="Delete ${esc(employee.name || "employee")}"><i data-lucide="trash-2" aria-hidden="true"></i></button></div></td>
    </tr>`;
  }).join("");
  window.lucide?.createIcons();
}

function resetForm() {
  $("employeeForm").reset();
  $("employeeRecordId").value = "";
  $("employeeId").value = "Generating…";
  $("employeeStatus").value = "Active";
  $("employeeFormError").textContent = "";
  if (isPrefillEnabled()) { $("employeeDepartment").value = "General"; $("employeeRole").value = "Staff"; $("employeeJoiningDate").value = today(); }
}
function openModal() { $("employeeModal").classList.remove("hidden"); document.body.style.overflow = "hidden"; $("employeeName").focus(); }
function closeModal() { $("employeeModal").classList.add("hidden"); document.body.style.overflow = ""; }
async function addEmployee() { editingId = ""; $("employeeModalTitle").textContent = "Add employee"; $("saveEmployeeBtn").querySelector("span").textContent = "Save employee"; resetForm(); openModal(); try { $("employeeId").value = await nextEmployeeId(); } catch (error) { $("employeeFormError").textContent = error.message || "Could not generate an employee ID."; } }
function editEmployee(employee) { editingId = employee.id; $("employeeModalTitle").textContent = "Edit employee"; $("saveEmployeeBtn").querySelector("span").textContent = "Update employee"; $("employeeRecordId").value = employee.id; $("employeeId").value = employee.employeeId || employee.id; $("employeeStatus").value = employee.status || "Active"; $("employeeName").value = employee.name || ""; $("employeeDepartment").value = employee.department || ""; $("employeeRole").value = employee.role || ""; $("employeeEmail").value = employee.email || ""; $("employeePhone").value = employee.phone || ""; $("employeeJoiningDate").value = employee.joiningDate || ""; $("employeeSalary").value = employee.monthlySalary ?? ""; $("employeeFormError").textContent = ""; openModal(); }

async function saveEmployee(event) {
  event.preventDefault();
  const name = $("employeeName").value.trim();
  if (!name) { $("employeeFormError").textContent = "Full name is required."; $("employeeName").focus(); return; }
  const salary = Number($("employeeSalary").value || 0);
  if (!Number.isFinite(salary) || salary < 0) { $("employeeFormError").textContent = "Monthly salary must be zero or greater."; return; }
  const data = { employeeId: $("employeeId").value.trim(), name, department: $("employeeDepartment").value.trim() || "General", role: $("employeeRole").value.trim(), email: $("employeeEmail").value.trim().toLowerCase(), phone: $("employeePhone").value.trim(), joiningDate: $("employeeJoiningDate").value, monthlySalary: salary, status: $("employeeStatus").value, updatedAt: serverTimestamp() };
  const save = $("saveEmployeeBtn"); save.disabled = true; save.querySelector("span").textContent = "Saving…"; $("employeeFormError").textContent = "";
  try { if (editingId) { await updateDoc(doc(db, "hr_employees", editingId), data); toast("Employee updated successfully"); } else { data.createdAt = serverTimestamp(); await addDoc(collection(db, "hr_employees"), data); toast("Employee added successfully"); } closeModal(); }
  catch (error) { $("employeeFormError").textContent = error.message || "Could not save employee."; }
  finally { save.disabled = false; save.querySelector("span").textContent = editingId ? "Update employee" : "Save employee"; }
}
async function deleteEmployee(employee) { if (!confirm(`Delete ${employee.name || employee.employeeId || "this employee"}?`)) return; try { await deleteDoc(doc(db, "hr_employees", employee.id)); toast("Employee deleted"); } catch (error) { toast(error.message || "Could not delete employee.", false); } }
function listen() { unsubscribe?.(); $("employeeLoading").classList.remove("hidden"); unsubscribe = onSnapshot(collection(db, "hr_employees"), (snapshot) => { employees.clear(); snapshot.forEach((item) => employees.set(item.id, { id: item.id, ...item.data() })); showError(""); render(); }, (error) => { $("employeeLoading").classList.add("hidden"); showError(`Could not load employees (${error.code || "error"}).`); }); }
function setupMenus() { const toggle = $("hrEmployeesMenuToggle"); const menu = $("hrEmployeesMenu"); const close = () => { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); }; toggle.addEventListener("click", (event) => { event.stopPropagation(); menu.hidden = !menu.hidden; toggle.setAttribute("aria-expanded", String(!menu.hidden)); }); document.addEventListener("pointerdown", (event) => { if (!event.target.closest(".hr-employees-dropdown-wrap")) close(); }); document.addEventListener("keydown", (event) => { if (event.key === "Escape") { close(); if (!$("employeeModal").classList.contains("hidden")) closeModal(); } }); }
function init() { setupMenus(); $("addEmployeeBtn").addEventListener("click", addEmployee); $("closeEmployeeModal").addEventListener("click", closeModal); $("cancelEmployeeBtn").addEventListener("click", closeModal); $("employeeModal").addEventListener("click", (event) => { if (event.target === $("employeeModal")) closeModal(); }); $("employeeForm").addEventListener("submit", saveEmployee); $("employeeSearch").addEventListener("input", render); $("employeeStatusFilter").addEventListener("change", render); $("employeeRows").addEventListener("click", (event) => { const button = event.target.closest("[data-action]"); if (!button) return; const employee = employees.get(button.dataset.id); if (!employee) return; button.dataset.action === "edit" ? editEmployee(employee) : deleteEmployee(employee); }); window.addEventListener("corebiq:signout-request", () => signOut(auth)); onAuthStateChanged(auth, async (user) => { if (!user || normalize(user.email) !== ADMIN) { unsubscribe?.(); if (user) await signOut(auth); const next = encodeURIComponent(location.pathname.replace(/^\//, "") + location.search + location.hash); location.replace(new URL(`auth/login.html?next=${next}`, document.baseURI).href); return; } $("hr-employees-app").classList.remove("hidden"); listen(); window.lucide?.createIcons(); if (location.hash === "#add") addEmployee(); }); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
