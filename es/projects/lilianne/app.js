let elements = [];
let selectedSymbol = null;

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

function renderTable() {
  const container = document.getElementById("periodicTable");
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
  document.getElementById("elementPanel").scrollTop = 0;
}

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

function renderAtomSVG(containerId, shellListId, configId, element) {
  const container = document.getElementById(containerId);
  const shellList = document.getElementById(shellListId);
  const configHost = document.getElementById(configId);

  if (!container || !shellList || !configHost || !element) return;

  const shells = Array.isArray(element.shells) ? element.shells : [];
  const config = element.electronConfig || "Configuración no disponible";

  container.innerHTML = "";
  shellList.innerHTML = "";
  configHost.textContent = config;

  if (!shells.length) {
    container.innerHTML = `<div class="atom-empty">Sin datos de niveles</div>`;
    return;
  }

  const size = 220;
  const center = size / 2;
  const ns = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.classList.add("atom-svg");

  const nucleus = document.createElementNS(ns, "circle");
  nucleus.setAttribute("cx", center);
  nucleus.setAttribute("cy", center);
  nucleus.setAttribute("r", 18);
  nucleus.setAttribute("class", "atom-nucleus-circle");
  svg.appendChild(nucleus);

  const nucleusText = document.createElementNS(ns, "text");
  nucleusText.setAttribute("x", center);
  nucleusText.setAttribute("y", center - 2);
  nucleusText.setAttribute("text-anchor", "middle");
  nucleusText.setAttribute("class", "atom-nucleus-symbol");
  nucleusText.textContent = element.symbol;
  svg.appendChild(nucleusText);

  const numberText = document.createElementNS(ns, "text");
  numberText.setAttribute("x", center);
  numberText.setAttribute("y", center + 11);
  numberText.setAttribute("text-anchor", "middle");
  numberText.setAttribute("class", "atom-nucleus-number");
  numberText.textContent = element.number;
  svg.appendChild(numberText);

  const shellNames = ["K", "L", "M", "N", "O", "P", "Q"];

  shells.forEach((count, index) => {
    const radius = 34 + index * 24;

    const orbit = document.createElementNS(ns, "circle");
    orbit.setAttribute("cx", center);
    orbit.setAttribute("cy", center);
    orbit.setAttribute("r", radius);
    orbit.setAttribute("class", "atom-orbit");
    svg.appendChild(orbit);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);

      const electron = document.createElementNS(ns, "circle");
      electron.setAttribute("cx", x);
      electron.setAttribute("cy", y);
      electron.setAttribute("r", 3.2);
      electron.setAttribute("class", "atom-electron");
      svg.appendChild(electron);
    }

    const item = document.createElement("div");
    item.className = "edu-shell-item";
    item.innerHTML = `
      <strong>${shellNames[index] ?? `Nivel ${index + 1}`}</strong>
      <span>${count} electrones</span>
    `;
    shellList.appendChild(item);
  });

  container.appendChild(svg);
}

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
  if (first) first.classList.add("is-active");
}

function applyFilter(type, value){
  document.querySelectorAll(".element").forEach(node => {

    if(type === "all"){
      node.classList.remove("is-dimmed");
      return;
    }

    let match = false;

    if(type === "category"){
      match = node.dataset.category === value;
    }

    if(type === "group"){
      match = String(node.dataset.group) === String(value);
    }

    if(type === "period"){
      match = String(node.dataset.period) === String(value);
    }

    node.classList.toggle("is-dimmed", !match);
  });
}

init().catch(err => {
  console.error("[Lilianne]", err);
});