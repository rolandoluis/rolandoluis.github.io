(() => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Active nav link
  const path = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach(a => {
      const href = a.getAttribute("href");
      if (!href) return;
      if (href === "/" && path === "/") a.classList.add("is-active");
      else if (href !== "/" && path.endsWith(href)) a.classList.add("is-active");
    });
  })();

  // Language preference
  document.querySelectorAll("[data-lang]").forEach(el => {
    el.addEventListener("click", () => {
      localStorage.setItem("site_lang", el.getAttribute("data-lang"));
    });
  });

  // --- Language-aware links -----------------------------------
  (function () {
  
    const path = window.location.pathname;
  
    let lang = "es";
  
    if (path.startsWith("/en/")) {
      lang = "en";
    }
  
    document.querySelectorAll("[data-i18n-link]").forEach(el => {
  
      const target = el.getAttribute("data-i18n-link");
  
      el.setAttribute("href", "/" + lang + "/" + target);
  
    });
  
  })();

