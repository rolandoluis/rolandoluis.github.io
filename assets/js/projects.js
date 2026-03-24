(() => {
  const layout = document.getElementById("projectsLayout");
  const grid = document.getElementById("projectsGrid");
  const focus = document.getElementById("projectsFocus");
  const explore = document.getElementById("projectsExplore");

  const frame = document.getElementById("projectsDemoFrame");
  const placeholder = document.getElementById("projectsDemoPlaceholder");

  const title = document.getElementById("projectTitle");
  const desc = document.getElementById("projectDescription");
  const meta = document.getElementById("projectMeta");
  const tags = document.getElementById("projectTags");
  const demoTitle = document.getElementById("projectDemoTitle");
  const demoSubtitle = document.getElementById("projectDemoSubtitle");

  const typeBadge = document.getElementById("projectTypeBadge");
  const statusBadge = document.getElementById("projectStatusBadge");

  const openFull = document.getElementById("projectOpenFull");
  const engineering = document.getElementById("projectEngineering");
  const repo = document.getElementById("projectRepo");
  const back = document.getElementById("projectBack");

  const filters = document.getElementById("projectsFilters");
  

  if (!layout || !grid) return;

  const getLangFromPath = (p) => {
    if (p.startsWith("/en/")) return "en";
    if (p.startsWith("/es/")) return "es";
    return "es";
  };

  const lang = window.siteLang || getLangFromPath(location.pathname);
  let projects = [];
  let activeFilter = "all";
  let currentProject = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadProjectsJson() {
    const res = await fetch(`/assets/data/${lang}/projects.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading projects.json`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("projects.json must be an array");
    return data;
  }

  function normalizeProject(p) {
    const clean = (v) => (typeof v === "string" ? v.trim() : "");
    return {
      title: clean(p.title),
      slug: clean(p.slug),
      description: clean(p.description),
      category: clean(p.category),
      type: clean(p.type || "project").toLowerCase(),
      status: clean(p.status || "stable").toLowerCase(),
      featured: !!p.featured,
      demoMode: clean(p.demoMode || "iframe"),
      demoUrl: clean(p.demoUrl),
      repoUrl: clean(p.repoUrl),
      engineeringUrl: clean(p.engineeringUrl),
      tags: Array.isArray(p.tags) ? p.tags.filter(Boolean) : [],
      stack: Array.isArray(p.stack) ? p.stack.filter(Boolean) : []
    };
  }

  function sortProjects(items) {
    return [...items].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.title.localeCompare(b.title, lang);
    });
  }

  function filteredProjects() {
    if (activeFilter === "all") return sortProjects(projects);
    return sortProjects(projects.filter(p => p.type === activeFilter));
  }

  function renderTiles() {
    grid.innerHTML = "";

    const items = filteredProjects();

    if (!items.length) {
      grid.innerHTML = `<article class="project-tile"><div class="project-tile-link"><h3 class="project-tile-title">Sin resultados</h3><p class="project-tile-desc">No hay proyectos para este filtro.</p></div></article>`;
      return;
    }

    items.forEach((p) => {
      const tile = document.createElement("article");
      tile.className = "project-tile";
      tile.dataset.type = p.type;

      tile.innerHTML = `
        <a href="#${escapeHtml(p.slug)}" class="project-tile-link" data-project="${escapeHtml(p.slug)}">
          <div>
            <div class="project-tile-top">
              <span class="project-tile-type">${escapeHtml(p.type)}</span>
              <span class="project-tile-status">${escapeHtml(p.status)}</span>
            </div>

            <h3 class="project-tile-title">${escapeHtml(p.title)}</h3>
            <p class="project-tile-desc">${escapeHtml(p.description)}</p>
          </div>

          <div class="project-tile-bottom">
            <div class="project-tile-tags">
              ${p.tags.slice(0, 3).map(tag => `<span class="project-tile-tag">#${escapeHtml(tag)}</span>`).join("")}
            </div>
            <span class="project-tile-cta">Abrir →</span>
          </div>
        </a>
      `;

      grid.appendChild(tile);
    });
  }

  function openPreview(project){
    const preview = document.getElementById("projectPreview");
    const frame = document.getElementById("previewFrame");
    
    preview.hidden = false;
    frame.src = `${project.demoUrl}?embed=projects`;
    
    document.getElementById("previewTitle").textContent = project.title;
  }

  function setFilter(filter) {
    activeFilter = filter;
    filters?.querySelectorAll(".projects-filter").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.filter === filter);
    });
    renderTiles();
  }

  function enterFocusMode(project) {
    layout.classList.remove("is-explore");
    layout.classList.add("is-focus");
    currentProject = project;
    explore.hidden = true;
    focus.hidden = false;

    title.textContent = project.title;
    desc.textContent = project.description || "";
    demoTitle.textContent = project.title;
    demoSubtitle.textContent = project.category || "Preview interactiva";

    typeBadge.textContent = project.type;
    statusBadge.textContent = project.status;

    meta.innerHTML = "";
    tags.innerHTML = "";

    const metaItems = [
      project.category ? `Categoría: ${project.category}` : "",
      project.demoMode ? `Modo: ${project.demoMode}` : "",
      project.stack.length ? `Stack: ${project.stack.join(", ")}` : ""
    ].filter(Boolean);

    metaItems.forEach(item => {
      const div = document.createElement("div");
      div.className = "projects-meta-item";
      div.textContent = item;
      meta.appendChild(div);
    });

    project.tags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "projects-tag";
      span.textContent = `#${tag}`;
      tags.appendChild(span);
    });

    openFull.hidden = !project.demoUrl;
    openFull.href = project.demoUrl || "#";

    engineering.hidden = !project.engineeringUrl;
    engineering.href = project.engineeringUrl || "#";

    repo.hidden = !project.repoUrl;
    repo.href = project.repoUrl || "#";

    if (project.demoMode === "iframe" && project.demoUrl) {
      placeholder.hidden = true;
      frame.hidden = false;
      const url = new URL(project.demoUrl, window.location.origin);
      url.searchParams.set("embed", "projects");
      frame.src = url.toString();
    } else {
      frame.hidden = true;
      frame.src = "";
      placeholder.hidden = false;
      placeholder.textContent = "Este proyecto no tiene demo embebida disponible en este momento.";
    }

    history.replaceState(null, "", `#${project.slug}`);
  }

  function exitFocusMode() {
    layout.classList.remove("is-focus");
    layout.classList.add("is-explore");

    focus.hidden = true;
    explore.hidden = false;

    frame.src = "";
    frame.hidden = true;
    placeholder.hidden = false;
    placeholder.textContent = "Selecciona un proyecto para cargar su demo.";

    history.replaceState(null, "", location.pathname);
  }

  document.addEventListener("click", (e) => {
    const tile = e.target.closest("[data-project]");
    if (!tile) return;

    e.preventDefault();
    const slug = tile.dataset.project;
    const project = projects.find(p => p.slug === slug);
    if (!project) return;

    enterFocusMode(project);
  });

  document.getElementById("previewExpand").addEventListener("click", () => {
    openPreview(currentProject);
  });

  document.getElementById("previewClose").addEventListener("click", () => {
    const preview = document.getElementById("projectPreview");
    const frame = document.getElementById("previewFrame");

    preview.hidden = true;
    frame.src = "";
  });

  back?.addEventListener("click", () => {
    exitFocusMode();
  });

  filters?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    setFilter(btn.dataset.filter);
  });

  (async () => {
    try {
      projects = (await loadProjectsJson()).map(normalizeProject);
      renderTiles();

      const initial = (location.hash || "").replace(/^#/, "").trim();
      const project = projects.find(p => p.slug === initial);

      if (project) enterFocusMode(project);
      else exitFocusMode();

    } catch (err) {
      console.error("[projects.js]", err);
      grid.innerHTML = `<article class="project-tile"><div class="project-tile-link"><h3 class="project-tile-title">Error</h3><p class="project-tile-desc">No se pudieron cargar los proyectos.</p></div></article>`;
    }
  })();
})();