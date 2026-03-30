document.addEventListener("DOMContentLoaded", initLab);

async function initLab() {
  const data = await fetch("/assets/data/es/lab.json").then(r => r.json());
  const items = data.items;

  renderMetrics(items);
  renderMatrix(items.filter(i => !i.archived));
  renderStream(items.filter(i => !i.archived));
  renderArchive(items.filter(i => i.archived));
  renderCandidates(items.filter(i => i.promotable));
}

/* =========================================================
   METRICS
   ========================================================= */
function renderMetrics(items) {
  const counts = {
    active: items.filter(i => !i.archived).length,
    prototype: items.filter(i => i.status === "prototype").length,
    visual: items.filter(i => i.category === "visual").length,
    archived: items.filter(i => i.archived).length
  };

  Object.keys(counts).forEach(key => {
    const el = document.querySelector(`[data-lab-metric="${key}"]`);
    if (el) el.textContent = counts[key];
  });
}

/* =========================================================
   MATRIX
   ========================================================= */
function renderMatrix(items) {
  const container = document.querySelector("[data-lab-matrix]");
  if (!container) return;

  container.innerHTML = items.map(item => `
    <article class="lab-tile lab-tile--${item.layout}">
      <div class="lab-badge is-${item.status}">${item.status}</div>

      <h3 class="lab-tile__title">
        <a href="${item.url}">${item.title}</a>
      </h3>

      <p class="lab-tile__summary">${item.summary}</p>

      <p class="lab-tile__goal">
        <strong>Goal:</strong> ${item.goal}
      </p>

      <div class="lab-meta">
        <span class="lab-meta-chip">v${item.version}</span>
        ${item.stack.map(s => `<span class="lab-meta-chip">${s}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

/* =========================================================
   STREAM
   ========================================================= */
function renderStream(items) {
  const container = document.querySelector("[data-lab-stream]");
  if (!container) return;

  container.innerHTML = items.map(item => `
    <article class="lab-entry">
      <div class="lab-entry__meta">
        <span class="lab-badge is-${item.status}">${item.status}</span>
        <span>${item.category}</span>
        <span>v${item.version}</span>
      </div>

      <div class="lab-entry__content">
        <h3><a href="${item.url}">${item.title}</a></h3>
        <p>${item.summary}</p>
        <p><strong>Goal:</strong> ${item.goal}</p>
      </div>

      <div class="lab-entry__aside">
        ${item.stack.map(s => `<span class="lab-meta-chip">${s}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

/* =========================================================
   ARCHIVE
   ========================================================= */
function renderArchive(items) {
  const container = document.querySelector("[data-lab-archive]");
  if (!container) return;

  container.innerHTML = items.map(item => `
    <article class="lab-tile lab-tile--compact">
      <h3><a href="${item.url}">${item.title}</a></h3>
      <p>${item.summary}</p>
    </article>
  `).join("");
}

/* =========================================================
   CANDIDATES (Lab → Projects)
   ========================================================= */
function renderCandidates(items) {
  const container = document.querySelector("[data-lab-candidates]");
  if (!container) return;

  container.innerHTML = items.map(item => `
    <span class="lab-meta-chip">${item.title}</span>
  `).join("");
}