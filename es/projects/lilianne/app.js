/**
 * =========================
 * ESTADO GLOBAL
 * =========================
 */
let elements = [];
let selectedSymbol = null;


/**
 * =========================
 * INIT
 * =========================
 * Carga datos y arranca la app
 */
async function init() {
  const res = await fetch("./data/elements.es.json");

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  elements = await res.json();

  renderFilters();
  renderTable();
  bindSearch();

  // Selección inicial
  const initial = elements.find(e => e.symbol === "Si") || elements[0];
  if (initial) selectElement(initial.symbol);
}


/**
 * =========================
 * TABLA PERIÓDICA
 * =========================
 */
function renderTable() {
  const container = document.getElementById("periodicTable");
  container.innerHTML = "";

  elements.forEach(el => {
    const cell = document.createElement("button");

    cell.className = `element category-${el.categoryKey}`;
    cell.dataset.symbol = el.symbol;
    cell.dataset.category = el.categoryKey;
    cell.dataset.group = el.group ?? "";
    cell.dataset.period = el.period ?? "";

    cell.style.gridColumn = el.x;
    cell.style.gridRow = el.y;

    cell.innerHTML = `
      <span>${el.number}</span>
      <span>${el.symbol}</span>
      <span>${el.name}</span>
    `;

    cell.addEventListener("click", () => selectElement(el.symbol));

    container.appendChild(cell);
  });
}


/**
 * =========================
 * SELECCIÓN DE ELEMENTO
 * =========================
 */
function selectElement(symbol) {
  const el = elements.find(e => e.symbol === symbol);
  if (!el) return;

  selectedSymbol = symbol;

  // Marcar activo
  document.querySelectorAll(".element").forEach(node => {
    node.classList.toggle("active", node.dataset.symbol === symbol);
  });

  // Panel
  document.getElementById("elSymbol").textContent = el.symbol;
  document.getElementById("elName").textContent = el.name;
  document.getElementById("elNumber").textContent = `#${el.number}`;
  document.getElementById("elMass").textContent = el.mass ?? "—";
  document.getElementById("elCategory").textContent = el.categoryLabel ?? "—";
  document.getElementById("elGroup").textContent = el.group ?? "—";
  document.getElementById("elPeriod").textContent = el.period ?? "—";
  document.getElementById("elState").textContent = el.stateLabel ?? "—";
  document.getElementById("elSummary").textContent = el.summary || "";

  // Render educativo
  renderAtomSVG("elAtomVisual", "elShellList", "elElectronConfig", el);
}


/**
 * =========================
 * SVG BASE (núcleo)
 * =========================
 */
function createBaseSVG(container) {
  const size = 240;
  const center = size / 2;
  const ns = "http://www.w3.org/2000/svg";

  container.innerHTML = "";

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  // núcleo
  const nucleus = document.createElementNS(ns, "circle");
  nucleus.setAttribute("cx", center);
  nucleus.setAttribute("cy", center);
  nucleus.setAttribute("r", 18);
  svg.appendChild(nucleus);

  // símbolo
  const symbol = document.createElementNS(ns, "text");
  symbol.setAttribute("id", "atomSymbol");
  symbol.setAttribute("x", center);
  symbol.setAttribute("y", center);
  symbol.setAttribute("text-anchor", "middle");
  svg.appendChild(symbol);

  // número
  const number = document.createElementNS(ns, "text");
  number.setAttribute("id", "atomNumber");
  number.setAttribute("x", center);
  number.setAttribute("y", center + 12);
  number.setAttribute("text-anchor", "middle");
  svg.appendChild(number);

  container.appendChild(svg);

  return svg;
}


/**
 * =========================
 * RENDER ÁTOMO
 * =========================
 */
function renderAtomSVG(containerId, shellListId, configId, element) {

  const container = document.getElementById(containerId);
  const shellList = document.getElementById(shellListId);
  const configHost = document.getElementById(configId);

  const shells = element.shells || [];
  const center = 120;

  shellList.innerHTML = "";
  configHost.textContent = element.electronConfig || "";

  let svg = container.querySelector("svg");

  if (!svg) {
    svg = createBaseSVG(container);
  }

  // actualizar núcleo
  svg.querySelector("#atomSymbol").textContent = element.symbol;
  svg.querySelector("#atomNumber").textContent = element.number;

  // limpiar órbitas
  svg.querySelectorAll(".atom-orbit").forEach(o => o.remove());

  // crear órbitas
  shells.forEach((_, i) => {
    const orbit = document.createElementNS(svg.namespaceURI, "circle");
    orbit.setAttribute("cx", center);
    orbit.setAttribute("cy", center);
    orbit.setAttribute("r", 34 + i * 24);
    orbit.setAttribute("class", "atom-orbit");
    svg.appendChild(orbit);
  });

  // electrones dinámicos
  updateElectrons(svg, shells, center);

  // lista
  shells.forEach((n, i) => {
    const item = document.createElement("div");
    item.textContent = `${["K","L","M","N","O","P","Q"][i]}: ${n}`;
    shellList.appendChild(item);
  });
}


/**
 * =========================
 * ELECTRONES DINÁMICOS
 * =========================
 */
function updateElectrons(svg, shells, center) {
  let index = 0;

  shells.forEach((count, shellIndex) => {
    const radius = 34 + shellIndex * 24;

    for (let i = 0; i < count; i++) {

      const angle = (Math.PI * 2 / count) * i;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);

      let e = svg.querySelector(`[data-e="${index}"]`);

      if (!e) {
        e = document.createElementNS(svg.namespaceURI, "circle");
        e.setAttribute("r", 3);
        e.dataset.e = index;
        svg.appendChild(e);
      }

      e.setAttribute("cx", x);
      e.setAttribute("cy", y);

      index++;
    }
  });

  // eliminar sobrantes
  svg.querySelectorAll("circle[data-e]").forEach(el => {
    if (Number(el.dataset.e) >= index) el.remove();
  });
}


/**
 * =========================
 * FILTROS
 * =========================
 */
function renderFilters() {
  const host = document.getElementById("filtersContainer");

  const categories = [
    "all","noMetal","metalAlcalino","alcalinoterreo",
    "metalTransicion","postMetal","metaloide",
    "halogeno","gasNoble"
  ];

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;

    btn.addEventListener("click", () => applyFilter(cat));

    host.appendChild(btn);
  });
}


/**
 * Aplica filtro visual
 */
function applyFilter(value) {
  document.querySelectorAll(".element").forEach(node => {
    node.classList.toggle("is-dimmed",
      value !== "all" && node.dataset.category !== value
    );
  });
}


/**
 * =========================
 * BUSCADOR
 * =========================
 */
function bindSearch() {
  const input = document.getElementById("searchInput");

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();

    document.querySelectorAll(".element").forEach(node => {
      const el = elements.find(e => e.symbol === node.dataset.symbol);

      const match =
        el.symbol.toLowerCase().includes(q) ||
        el.name.toLowerCase().includes(q);

      node.classList.toggle("is-dimmed", !match);
    });
  });
}


// START
init();