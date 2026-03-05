(() => {
  const lang = (document.documentElement.lang || "es").toLowerCase().startsWith("en") ? "en" : "es";
  const LABEL = lang === "en" ? "Figure" : "Figura";
  const DASH = " — ";

  const figures = Array.from(document.querySelectorAll("figure.article-figure"));
  if (!figures.length) return;

  const map = new Map(); // id -> { n, caption }
  let n = 0;

  // 1) Numeración + caption normalizado
  for (const fig of figures) {
    n += 1;

    if (!fig.id) fig.id = `fig-${n}`;

    let cap = fig.querySelector("figcaption");
    if (!cap) {
      cap = document.createElement("figcaption");
      fig.appendChild(cap);
    }

    const raw = (cap.textContent || "").trim();

    // Limpia "Figura N — " / "Figure N — " si ya existe
    const dashEsc = DASH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefixRx = new RegExp(`^${LABEL}\\s+\\d+\\s+${dashEsc}`, "i");
    const clean = raw.replace(prefixRx, "").trim();

    cap.textContent = clean ? `${LABEL} ${n}${DASH}${clean}` : `${LABEL} ${n}`;
    map.set(fig.id, { n, caption: clean || "" });
  }

  // 2) Referencias en texto: <a data-figref="fig-x"></a>
  const refs = Array.from(document.querySelectorAll("[data-figref]"));
  for (const el of refs) {
    const id = (el.getAttribute("data-figref") || "").trim();
    if (!id) continue;

    const meta = map.get(id);
    el.textContent = meta ? `${LABEL} ${meta.n}` : (lang === "en" ? "Figure ?" : "Figura ?");
    if (!el.getAttribute("href")) el.setAttribute("href", `#${id}`);
  }

  // 3) Tabla de Figuras: <nav data-figures></nav>
  const nav = document.querySelector("[data-figures]");
  if (nav) {
    nav.innerHTML = "";

    for (const fig of figures) {
      const meta = map.get(fig.id);
      if (!meta) continue;

      const a = document.createElement("a");
      a.className = "figs-item";
      a.href = `#${fig.id}`;
      a.textContent = meta.caption
        ? `${LABEL} ${meta.n}${DASH}${meta.caption}`
        : `${LABEL} ${meta.n}`;

      nav.appendChild(a);
    }
  }

  // 4) Highlight al saltar a una figura
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-figref], .figs-item");
    if (!a) return;

    const href = a.getAttribute("href") || "";
    const id = href.startsWith("#")
      ? href.slice(1)
      : (a.getAttribute("data-figref") || "");

    const fig = id ? document.getElementById(id) : null;
    if (!fig) return;

    fig.classList.add("is-highlight");
    setTimeout(() => fig.classList.remove("is-highlight"), 900);
  });
})();