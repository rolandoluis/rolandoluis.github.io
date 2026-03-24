let elements = [];

async function initPreview() {
  const res = await fetch("./data/elements.es.json");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} cargando elements.es.json`);
  }

  elements = await res.json();

  renderTable();
  selectDefaultElement("O");
}

function renderTable() {
  const container = document.getElementById("periodicTable");
  container.innerHTML = "";

  elements.forEach(el => {
    const cell = document.createElement("div");
    cell.className = `element category-${el.categoryKey}`;
    cell.dataset.symbol = el.symbol;

    cell.style.gridColumn = el.x;
    cell.style.gridRow = el.y;

    cell.innerHTML = `
      <span class="el-number">${el.number}</span>
      <span class="el-symbol">${el.symbol}</span>
      <span class="el-name">${el.name}</span>
    `;

    container.appendChild(cell);
  });
}

function selectDefaultElement(symbol) {
  const el = elements.find(e => e.symbol === symbol) || elements[0];
  if (!el) return;

  document.querySelectorAll(".element").forEach(node => {
    node.classList.toggle("active", node.dataset.symbol === el.symbol);
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
}

initPreview().catch(err => {
  console.error("[Lilianne preview]", err);
});