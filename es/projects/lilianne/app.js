/**
 * Lilianne
 * Controla:
 * - carga de datos
 * - render de tabla periódica
 * - filtros y búsqueda
 * - selección de elementos
 * - visualización educativa del átomo con SVG dinámico
 */

let elements = [];
let selectedSymbol = null;

/**
 * Inicializa la aplicación:
 * - carga el JSON
 * - renderiza filtros
 * - renderiza tabla
 * - activa búsqueda
 * - selecciona un elemento inicial
 */
async function init() {
  const res = await fetch("./data/elements.es.json");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} cargando elements.es.json`);
  }

  elements = await res.json();

  renderFilters();
  renderTable();
  bindSearch();

  const initial = elements.find(e => e.symbol === "Si") || elements[0];
  if (initial) {
    selectElement(initial.symbol);
  }
}

/**
 * Renderiza toda la tabla periódica
 * respetando la estructura HTML que espera el CSS.
 */
function renderTable() {
  const container = document.getElementById("periodicTable");
  if (!container) return;

  container.innerHTML = "";

  elements.forEach(el => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `element category-${el.categoryKey}`;
    cell.dataset.symbol = el.symbol;
    cell.dataset.category = el.categoryKey;
    cell.dataset.group = el.group ?? "";
    cell.dataset.period = el.period ?? "";

    // Posición real en la tabla
    cell.style.gridColumn = el.x;
    cell.style.gridRow = el.y;

    // Estructura visual correcta para el CSS actual
    cell.innerHTML = `
      <span class="el-number">${el.number}</span>
      <span class="el-symbol">${el.symbol}</span>
      <span class="el-name">${el.name}</span>
    `;

    cell.addEventListener("click", () => {
      selectElement(el.symbol);
    });

    container.appendChild(cell);
  });
}

/**
 * Selecciona un elemento:
 * - lo marca como activo en la tabla
 * - actualiza panel lateral
 * - renderiza estructura electrónica
 */
function selectElement(symbol) {
  const el = elements.find(e => e.symbol === symbol);
  if (!el) return;

  selectedSymbol = symbol;

  document.querySelectorAll(".element").forEach(node => {
    node.classList.toggle("active", node.dataset.symbol === symbol);
  });

  document.getElementById("elSymbol").textContent = el.symbol;
  document.getElementById("elName").textContent = el.name;
  document.getElementById("elNumber").textContent = `#${el.number}`;
  document.getElementById("elMass").textContent = el.mass ?? "—";
  document.getElementById("elCategory").textContent = el.categoryLabel ?? "—";
  document.getElementById("elGroup").textContent = el.group ?? "—";
  document.getElementById("elPeriod").textContent = el.period ?? "—";
  document.getElementById("elState").textContent = el.stateLabel ?? "—";
  document.getElementById("elSummary").textContent = el.summary || "Sin resumen disponible.";
  document.getElementById("elWiki").href = el.wiki || "#";

  renderAtomSVG("elAtomVisual", "elShellList", "elElectronConfig", el);

  // el scroll debe afectar solo al contenido del panel
  const panelScroll = document.querySelector(".panel-scroll");
  if (panelScroll) {
    panelScroll.scrollTop = 0;
  }
}

/**
 * Activa la búsqueda dinámica por:
 * - símbolo
 * - nombre
 * - número atómico
 */
function bindSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();

    if (!q) {
      document.querySelectorAll(".element").forEach(node => {
        node.classList.remove("is-dimmed", "is-match");
      });
      return;
    }

    let firstMatch = null;

    document.querySelectorAll(".element").forEach(node => {
      const el = elements.find(e => e.symbol === node.dataset.symbol);
      if (!el) return;

      const match =
        String(el.symbol).toLowerCase().includes(q) ||
        String(el.name).toLowerCase().includes(q) ||
        String(el.number).toLowerCase() === q;

      node.classList.toggle("is-match", match);
      node.classList.toggle("is-dimmed", !match);

      if (match && !firstMatch) {
        firstMatch = el.symbol;
      }
    });

    if (firstMatch) {
      selectElement(firstMatch);
    }
  });
}

/**
 * Crea una única base SVG persistente
 * para evitar acumulación de capas.
 */
function createBaseSVG(container) {
  const size = 240;
  const center = size / 2;
  const ns = "http://www.w3.org/2000/svg";

  container.innerHTML = "";

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.classList.add("atom-svg");

  // Núcleo
  const nucleus = document.createElementNS(ns, "circle");
  nucleus.setAttribute("cx", center);
  nucleus.setAttribute("cy", center);
  nucleus.setAttribute("r", 18);
  nucleus.setAttribute("class", "atom-nucleus-circle");
  svg.appendChild(nucleus);

  // Símbolo del elemento
  const nucleusSymbol = document.createElementNS(ns, "text");
  nucleusSymbol.setAttribute("x", center);
  nucleusSymbol.setAttribute("y", center - 2);
  nucleusSymbol.setAttribute("text-anchor", "middle");
  nucleusSymbol.setAttribute("class", "atom-nucleus-symbol");
  nucleusSymbol.setAttribute("id", "atomSymbol");
  svg.appendChild(nucleusSymbol);

  // Número atómico
  const nucleusNumber = document.createElementNS(ns, "text");
  nucleusNumber.setAttribute("x", center);
  nucleusNumber.setAttribute("y", center + 11);
  nucleusNumber.setAttribute("text-anchor", "middle");
  nucleusNumber.setAttribute("class", "atom-nucleus-number");
  nucleusNumber.setAttribute("id", "atomNumber");
  svg.appendChild(nucleusNumber);

  container.appendChild(svg);
  return svg;
}

/**
 * Renderiza el átomo del elemento:
 * - actualiza núcleo
 * - redibuja órbitas
 * - redistribuye electrones
 * - actualiza lista textual de niveles
 */
function renderAtomSVG(containerId, shellListId, configId, element) {
  const container = document.getElementById(containerId);
  const shellList = document.getElementById(shellListId);
  const configHost = document.getElementById(configId);

  if (!container || !shellList || !configHost || !element) return;

  const shells = Array.isArray(element.shells) ? element.shells : [];
  const config = element.electronConfig || "Configuración no disponible";
  const shellNames = ["K", "L", "M", "N", "O", "P", "Q"];
  const size = 240;
  const center = size / 2;

  shellList.innerHTML = "";
  configHost.textContent = config;

  if (!shells.length) {
    container.innerHTML = `<div class="atom-empty">Sin datos de niveles</div>`;
    return;
  }

  let svg = container.querySelector("svg");
  if (!svg) {
    svg = createBaseSVG(container);
  }

  // Actualizar núcleo existente
  const atomSymbol = svg.querySelector("#atomSymbol");
  const atomNumber = svg.querySelector("#atomNumber");

  if (atomSymbol) atomSymbol.textContent = element.symbol;
  if (atomNumber) atomNumber.textContent = element.number;

  // Eliminar órbitas antiguas
  svg.querySelectorAll(".atom-orbit").forEach(orbit => orbit.remove());

  // Crear nuevas órbitas
  shells.forEach((_, index) => {
    const radius = 34 + index * 24;

    const orbit = document.createElementNS(svg.namespaceURI, "circle");
    orbit.setAttribute("cx", center);
    orbit.setAttribute("cy", center);
    orbit.setAttribute("r", radius);
    orbit.setAttribute("class", "atom-orbit");
    svg.appendChild(orbit);
  });

  // Actualizar electrones
  updateElectrons(svg, shells, center);

  // Render lista textual de niveles
  shells.forEach((count, index) => {
    const item = document.createElement("div");
    item.className = "edu-shell-item";
    item.innerHTML = `
      <strong>${shellNames[index] ?? `Nivel ${index + 1}`}</strong>
      <span>${count} electrones</span>
    `;
    shellList.appendChild(item);
  });
}

/**
 * Actualiza electrones sin recrear el SVG completo.
 * Esto evita acumulaciones y permite transiciones suaves.
 */
function updateElectrons(svg, shells, center) {
  let electronIndex = 0;

  shells.forEach((count, shellIndex) => {
    const radius = 34 + shellIndex * 24;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);

      let electron = svg.querySelector(`[data-e="${electronIndex}"]`);

      if (!electron) {
        electron = document.createElementNS(svg.namespaceURI, "circle");
        electron.setAttribute("r", 3.2);
        electron.setAttribute("class", "atom-electron");
        electron.dataset.e = String(electronIndex);
        electron.setAttribute("opacity", "0");
        svg.appendChild(electron);

        requestAnimationFrame(() => {
          electron.setAttribute("opacity", "1");
        });
      }

      electron.setAttribute("cx", x);
      electron.setAttribute("cy", y);

      electronIndex++;
    }
  });

  // Eliminar electrones sobrantes
  svg.querySelectorAll(".atom-electron").forEach(el => {
    if (Number(el.dataset.e) >= electronIndex) {
      el.setAttribute("opacity", "0");
      setTimeout(() => el.remove(), 250);
    }
  });
}

/**
 * Renderiza los filtros por categoría
 * respetando el estilo actual del proyecto.
 */
function renderFilters() {
  const host = document.getElementById("filtersContainer");
  if (!host) return;

  const categories = [
    { key: "all", label: "Todos" },
    { key: "noMetal", label: "No metales" },
    { key: "metalAlcalino", label: "Alcalinos" },
    { key: "alcalinoterreo", label: "Alcalinotérreos" },
    { key: "metalTransicion", label: "Transición" },
    { key: "postMetal", label: "Post-transición" },
    { key: "metaloide", label: "Metaloides" },
    { key: "halogeno", label: "Halógenos" },
    { key: "gasNoble", label: "Gases nobles" },
    { key: "lantanido", label: "Lantánidos" },
    { key: "actinido", label: "Actínidos" }
  ];

  host.innerHTML = "";

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-btn";
    btn.textContent = cat.label;
    btn.dataset.filter = cat.key;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => {
        b.classList.toggle("is-active", b === btn);
      });

      if (cat.key === "all") {
        applyFilter("all");
      } else {
        applyFilter("category", cat.key);
      }
    });

    host.appendChild(btn);
  });

  const first = host.querySelector(".filter-btn[data-filter='all']");
  if (first) {
    first.classList.add("is-active");
  }
}

/**
 * Aplica filtros visuales sobre la tabla.
 */
function applyFilter(type, value) {
  document.querySelectorAll(".element").forEach(node => {
    if (type === "all") {
      node.classList.remove("is-dimmed");
      return;
    }

    let match = false;

    if (type === "category") {
      match = node.dataset.category === value;
    }

    if (type === "group") {
      match = String(node.dataset.group) === String(value);
    }

    if (type === "period") {
      match = String(node.dataset.period) === String(value);
    }

    node.classList.toggle("is-dimmed", !match);
  });
}

// Arranque de la aplicación
init().catch(err => {
  console.error("[Lilianne]", err);
});