const $ = (id) => document.getElementById(id);
let expression = "";
let justCalculated = false;

function render() {
  $("calc-expression").textContent = expression || "0";
  $("calc-result").textContent = expression ? getPreview() : "0";
}

function getPreview() {
  try { return formatNumber(evaluate(expression)); }
  catch { return expression; }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) throw new Error("Invalid result");
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 10, useGrouping: false }).format(value);
}

function evaluate(value) {
  const input = String(value).replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
  if (!/^[0-9+\-*/().\s]+$/.test(input)) throw new Error("Invalid expression");
  const result = Function(`"use strict"; return (${input})`)();
  if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("Invalid result");
  return result;
}

function appendDigit(value) {
  if (justCalculated) expression = "";
  justCalculated = false;
  expression += value;
  render();
}

function appendOperator(value) {
  justCalculated = false;
  if (!expression) { if (value === "-") expression = "-"; return render(); }
  if (/[+\-*/.]$/.test(expression)) expression = expression.slice(0, -1);
  expression += value;
  render();
}

function appendDecimal() {
  if (justCalculated) expression = "";
  justCalculated = false;
  const current = expression.split(/[+\-*/]/).pop() || "";
  if (!current.includes(".")) expression += current ? "." : "0.";
  render();
}

function calculate() {
  if (!expression) return;
  try {
    const result = evaluate(expression);
    $("calc-expression").textContent = `${expression} =`;
    $("calc-result").textContent = formatNumber(result);
    expression = String(result);
    justCalculated = true;
  } catch {
    $("calc-result").textContent = "Error";
  }
}

function handleKey(value) {
  if (/^\d$/.test(value)) appendDigit(value);
  else if (value === ".") appendDecimal();
  else if (["+", "-", "*", "/"].includes(value)) appendOperator(value);
  else if (value === "%") { if (expression && !/%$/.test(expression)) expression += "%"; render(); }
  else if (value === "Enter" || value === "=") calculate();
  else if (value === "Backspace") { expression = expression.slice(0, -1); justCalculated = false; render(); }
  else if (value === "Escape") $("calculator-dialog").close();
}

function openCalculator() {
  const dialog = $("calculator-dialog");
  if (!dialog.open) dialog.showModal();
  render();
  dialog.querySelector(".calc-key")?.focus();
}

$("open-calculator").addEventListener("click", openCalculator);
$("open-calculator-secondary").addEventListener("click", openCalculator);
$("close-calculator").addEventListener("click", () => $("calculator-dialog").close());
document.querySelectorAll("[data-calc]").forEach((button) => button.addEventListener("click", () => {
  const action = button.dataset.calc;
  if (action === "clear") { expression = ""; justCalculated = false; render(); }
  else if (action === "backspace") handleKey("Backspace");
  else if (action === "percent") handleKey("%");
  else if (action === "digit") appendDigit(button.dataset.value);
  else if (action === "operator") appendOperator(button.dataset.value);
  else if (action === "decimal") appendDecimal();
  else if (action === "equals") calculate();
}));
document.addEventListener("keydown", (event) => {
  const dialog = $("calculator-dialog");
  if (!dialog.open) return;
  if ([" ", "Tab"].includes(event.key)) return;
  event.preventDefault();
  handleKey(event.key);
});
document.addEventListener("DOMContentLoaded", () => { if (window.lucide) window.lucide.createIcons(); render(); });
