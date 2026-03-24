(() => {

  let currentProject = null;
  let currentPreviewIndex = 0;
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
  const gallery = document.getElementById("projectGallery");
  const demoTitle = document.getElementById("projectDemoTitle");
  const demoSubtitle = document.getElementById("projectDemoSubtitle");

  const typeBadge = document.getElementById("projectTypeBadge");
  const statusBadge = document.getElementById("projectStatusBadge");

  const openFull = document.getElementById("projectOpenFull");
  const engineering = document.getElementById("projectEngineering");
  const repo = document.getElementById("projectRepo");
  const back = document.getElementById("projectBack");

  const filters = document.getElementById("projectsFilters");

  const preview = document.getElementById("projectPreview");
  const previewImage = document.getElementById("previewImage");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  const previewGalleryNav = document.getElementById("previewGalleryNav");
  const previewPrev = document.getElementById("previewPrev");
  const previewNext = document.getElementById("previewNext");
  const previewCounter = document.getElementById("previewCounter");
  const previewTitle = document.getElementById("previewTitle");
  const previewExpand = document.getElementById("previewExpand");
  const previewClose = document.getElementById("previewClose");

  if (!layout || !grid) return;

  const getLangFromPath = (p) => {
    if (p.startsWith("/en/")) return "en";
    if (p.startsWith("/es/")) return "es";
    return "es";
  };

  const lang = window.siteLang || getLangFromPath(location.pathname);

  let projects = [];
  let activeFilter = "all";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function withEmbedParam(urlValue) {
    if (!urlValue) return "";
    const url = new URL(urlValue, window.location.origin);
    url.searchParams.set("embed", "projects");
    return url.toString();
  }

  function previewSrc(project) {
    return project.previewUrl || project.demoUrl || "";
  }

  function fullSrc(project) {
    return project.demoUrl || "";
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
      previewUrl: clean(p.previewUrl),
      previewMode: clean(p.previewMode || "iframe"),
      thumb: clean(p.thumb),
      gallery: Array.isArray(p.gallery) ? p.gallery.filter(Boolean) : [],
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

      if (p.thumb) {
        tile.classList.add("has-thumb");
        tile.style.setProperty("--thumb", `url(${p.thumb})`);
      }

      tile.innerHTML = `
        <a href="#${escapeHtml(p.slug)}" class="project-tile-link" data-project="${escapeHtml(p.slug)}">
          <div>
            <div class="project-tile-top">
              <span class="project-tile-type">${escapeHtml(p.type === "app" ? "APP" : p.type)}</span>
              <span class="project-tile-status">${escapeHtml(p.status)}</span>
            </div>

            <h3 class="project-tile-title">${escapeHtml(p.title)}</h3>
            <p class="project-tile-desc">${escapeHtml(p.description)}</p>
          </div>

          <div class="project-tile-bottom">
            <div class="project-tile-tags">
              ${p.tags.slice(0, 3).map(tag => `<span class="project-tile-tag">#${escapeHtml(tag)}</span>`).join("")}
            </div>
            <span class="project-tile-cta">${p.type === "app" ? "Abrir aplicación →" : "Abrir →"}</span>
          </div>
        </a>
      `;

      grid.appendChild(tile);
    });
  }

  function openPreview(project) {
    if (!preview) return;

    currentProject = project;
    preview.hidden = false;
    previewTitle.textContent = project.title;

    renderPreviewImage(project, 0);
  }

  function closePreview() {
    if (!preview) return;

    preview.hidden = true;

    if (previewImage) {
      previewImage.src = "";
      previewImage.hidden = true;
    }

    if (previewPlaceholder) {
      previewPlaceholder.hidden = false;
    }

    if (previewGalleryNav) {
      previewGalleryNav.hidden = true;
    }

    currentPreviewIndex = 0;
  }

  function setFilter(filter) {
    activeFilter = filter;
    filters?.querySelectorAll(".projects-filter").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.filter === filter);
    });
    renderTiles();
    closePreview();
  }

  function renderGallery(project) {
    if (!gallery) return;

    gallery.innerHTML = "";

    if (!project.gallery || !project.gallery.length) {
      gallery.hidden = true;
      return;
    }

    project.gallery.forEach((src, index) => {
      const item = document.createElement("div");
      item.className = "projects-gallery-item";
      item.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(project.title)} · captura ${index + 1}">`;
      gallery.appendChild(item);
    });

    gallery.hidden = false;
  }

  function enterFocusMode(project) {
    currentProject = project;

    layout.classList.remove("is-explore");
    layout.classList.add("is-focus");

    explore.hidden = true;
    focus.hidden = false;
    closePreview();

    title.textContent = project.title;
    desc.textContent = project.description || "";
    demoTitle.textContent = project.title;
    demoSubtitle.textContent =
      project.type === "app"
        ? "Aplicación interactiva completa"
        : (project.category || "Preview interactiva");

    typeBadge.textContent = project.type === "app" ? "application" : project.type;
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

    renderGallery(project);

    openFull.hidden = !project.demoUrl;
    openFull.href = project.demoUrl || "#";

    engineering.hidden = !project.engineeringUrl;
    engineering.href = project.engineeringUrl || "#";

    repo.hidden = !project.repoUrl;
    repo.href = project.repoUrl || "#";

    if (project.demoMode === "iframe" && project.demoUrl) {
      placeholder.hidden = true;
      frame.hidden = false;
      frame.src = withEmbedParam(fullSrc(project));
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

    if (gallery) {
      gallery.innerHTML = "";
      gallery.hidden = true;
    }

    history.replaceState(null, "", location.pathname);
  }

    function previewImages(project) {
    if (project.gallery && project.gallery.length) return project.gallery;
    if (project.thumb) return [project.thumb];
    return [];
  }

  function renderPreviewImage(project, index = 0) {
    const images = previewImages(project);

    if (!images.length) {
      previewImage.hidden = true;
      previewImage.src = "";
      previewPlaceholder.hidden = false;
      previewGalleryNav.hidden = true;
      return;
    }

    currentPreviewIndex = Math.max(0, Math.min(index, images.length - 1));

    previewImage.src = images[currentPreviewIndex];
    previewImage.alt = `${project.title} · vista previa ${currentPreviewIndex + 1}`;
    previewImage.hidden = false;
    previewPlaceholder.hidden = true;

    if (images.length > 1) {
      previewGalleryNav.hidden = false;
      previewCounter.textContent = `${currentPreviewIndex + 1} / ${images.length}`;
    } else {
      previewGalleryNav.hidden = true;
    }
  }

  previewPrev?.addEventListener("click", () => {
    if (!currentProject) return;
    const images = previewImages(currentProject);
    if (!images.length) return;
    
    const nextIndex = (currentPreviewIndex - 1 + images.length) % images.length;
    renderPreviewImage(currentProject, nextIndex);
  });
  
  previewNext?.addEventListener("click", () => {
    if (!currentProject) return;
    const images = previewImages(currentProject);
    if (!images.length) return;
  
    const nextIndex = (currentPreviewIndex + 1) % images.length;
    renderPreviewImage(currentProject, nextIndex);
  });

  document.addEventListener("click", (e) => {
    const tile = e.target.closest("[data-project]");
    if (!tile) return;

    e.preventDefault();
    const slug = tile.dataset.project;
    const project = projects.find(p => p.slug === slug);
    if (!project) return;

    openPreview(project);
  });

  previewExpand?.addEventListener("click", () => {
    if (!currentProject) return;
    enterFocusMode(currentProject);
  });

  previewClose?.addEventListener("click", () => {
    closePreview();
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