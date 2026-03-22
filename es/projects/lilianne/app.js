let elements = [];
let selected = null;

async function init() {
  const res = await fetch("./data/elements.es.json");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} cargando elements.es.json`);
  }

  elements = await res.json();

  renderFilters();
  renderTable();
  bindSearch();
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

  document.getElementById("panelEmpty").hidden = true;
  document.getElementById("panelContent").hidden = false;

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

      applyFilter(cat.key);
    });

    host.appendChild(btn);
  });

  const first = host.querySelector(".filter-btn[data-filter='all']");
  if (first) first.classList.add("is-active");
}

function applyFilter(categoryKey) {
  document.querySelectorAll(".element").forEach(node => {
    if (categoryKey === "all") {
      node.classList.remove("is-dimmed");
      return;
    }

    const match = node.dataset.category === categoryKey;
    node.classList.toggle("is-dimmed", !match);
  });
}

init().catch(err => {
  console.error("[Lilianne]", err);
});