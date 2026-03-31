document.addEventListener("DOMContentLoaded", () => {
  CodeEngine.init();
});

const CodeEngine = {
  selector: 'pre > code[class*="language-"]',

  rules: {
    html: [
      { regex: /(&lt;!--[\s\S]*?--&gt;)/g, cls: "t-com" },
      { regex: /(&lt;\/?[a-zA-Z][\w:-]*)/g, cls: "t-tag" },
      { regex: /\b([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?=\=)/g, cls: "t-attr" },
      { regex: /"([^"]*)"|'([^']*)'/g, cls: "t-str" }
    ],
    css: [
      { regex: /(\/\*[\s\S]*?\*\/)/g, cls: "t-com" },
      { regex: /(@[\w-]+)/g, cls: "t-kw" },
      { regex: /([.#]?[a-zA-Z_][\w\-:>+~\s[\]="()*^$|,.#]*)(?=\s*\{)/g, cls: "t-tag" },
      { regex: /([a-z-]+)(?=\s*:)/g, cls: "t-attr" },
      { regex: /(:\s*)([^;}{]+)(;?)/g, replacer: (m, p1, p2, p3) => `${p1}<span class="t-str">${p2}</span>${p3}` },
      { regex: /\b(\d+(\.\d+)?)(px|rem|em|%|vh|vw|deg|s|ms)?\b/g, cls: "t-num" }
    ],
    js: [
      { regex: /(\/\*[\s\S]*?\*\/|\/\/.*$)/gm, cls: "t-com" },
      { regex: /("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)/g, cls: "t-str" },
      { regex: /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|new|class|extends|constructor|import|export|from|default|async|await|typeof|instanceof|null|true|false)\b/g, cls: "t-kw" },
      { regex: /\b(\d+(\.\d+)?)\b/g, cls: "t-num" },
      { regex: /\b([A-Za-z_$][\w$]*)(?=\s*\()/g, cls: "t-func" }
    ]
  },

  init() {
    const blocks = document.querySelectorAll(this.selector);
    if (!blocks.length) return;

    this.ensurePreview();

    blocks.forEach((code, index) => {
      const pre = code.parentElement;
      const lang = this.getLang(code);

      pre.classList.add("code-block");
      pre.dataset.lang = lang;

      const raw = this.normalizeCode(code.textContent);
      const highlighted = this.highlight(raw, lang);

      const toolbar = this.createToolbar(lang, raw, index);
      const body = this.createBody(raw, highlighted);

      pre.innerHTML = "";
      pre.appendChild(toolbar);
      pre.appendChild(body);
    });
  },

  getLang(code) {
    const match = code.className.match(/language-([a-z0-9-]+)/i);
    return match ? match[1].toLowerCase() : "text";
  },

  normalizeCode(text) {
    return text
      .replace(/^\n+/, "")
      .replace(/\s+$/, "")
      .replace(/\t/g, "  ");
  },

  escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  highlight(raw, lang) {
    let content = this.escapeHtml(raw);

    const rules = this.rules[lang];
    if (!rules) return content;

    rules.forEach(rule => {
      if (rule.replacer) {
        content = content.replace(rule.regex, rule.replacer);
      } else {
        content = content.replace(rule.regex, '<span class="' + rule.cls + '">$1</span>');
      }
    });

    return content;
  },

  createToolbar(lang, raw, index) {
    const toolbar = document.createElement("div");
    toolbar.className = "code-block__toolbar";

    const meta = document.createElement("div");
    meta.className = "code-block__meta";
    meta.innerHTML = `
      <span class="code-block__dots" aria-hidden="true"><span></span><span></span><span></span></span>
      <span class="code-block__lang">${lang}</span>
    `;

    const actions = document.createElement("div");
    actions.className = "code-block__actions";

    if (this.isRunnable(lang)) {
      const runBtn = document.createElement("button");
      runBtn.type = "button";
      runBtn.className = "code-btn code-btn--run";
      runBtn.textContent = "Run";
      runBtn.addEventListener("click", () => this.runCode(raw, lang, index));
      actions.appendChild(runBtn);
    }

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "code-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(raw);
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("is-copied");
        setTimeout(() => {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("is-copied");
        }, 1400);
      } catch {
        copyBtn.textContent = "Error";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 1400);
      }
    });

    actions.appendChild(copyBtn);
    toolbar.appendChild(meta);
    toolbar.appendChild(actions);

    return toolbar;
  },

  createBody(raw, highlighted) {
    const body = document.createElement("div");
    body.className = "code-block__body";

    const lineBox = document.createElement("div");
    lineBox.className = "code-block__lines";

    const lines = raw.split("\n").length;
    let nums = "";
    for (let i = 1; i <= lines; i += 1) {
      nums += `<span>${i}</span>`;
    }
    lineBox.innerHTML = nums;

    const code = document.createElement("code");
    code.innerHTML = highlighted;

    body.appendChild(lineBox);
    body.appendChild(code);

    return body;
  },

  isRunnable(lang) {
    return ["html", "css", "js"].includes(lang);
  },

  ensurePreview() {
    if (document.getElementById("codePreview")) return;

    const overlay = document.createElement("div");
    overlay.id = "codePreview";
    overlay.className = "code-preview";
    overlay.innerHTML = `
      <div class="code-preview__window" role="dialog" aria-modal="true" aria-labelledby="codePreviewTitle">
        <div class="code-preview__header">
          <p id="codePreviewTitle" class="code-preview__title">Preview</p>
          <button type="button" class="code-preview__close">Cerrar</button>
        </div>
        <iframe class="code-preview__frame" sandbox="allow-scripts"></iframe>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".code-preview__close").addEventListener("click", () => {
      this.closePreview();
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) this.closePreview();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) {
        this.closePreview();
      }
    });
  },

  closePreview() {
    const overlay = document.getElementById("codePreview");
    const frame = overlay?.querySelector(".code-preview__frame");
    if (frame) frame.srcdoc = "";
    overlay?.classList.remove("is-open");
  },

  runCode(raw, lang) {
    const overlay = document.getElementById("codePreview");
    const frame = overlay.querySelector(".code-preview__frame");
    const title = overlay.querySelector(".code-preview__title");

    title.textContent = `Preview · ${lang.toUpperCase()}`;
    frame.srcdoc = this.buildPreview(raw, lang);
    overlay.classList.add("is-open");
  },

  buildPreview(raw, lang) {
    if (lang === "html") {
      return raw;
    }

    if (lang === "css") {
      return `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body {
  margin: 0;
  padding: 24px;
  font-family: system-ui, sans-serif;
  background: #f6f8fb;
  color: #111827;
}
.preview-wrap { display: grid; gap: 16px; }
.card {
  padding: 16px;
  border: 1px solid #d8dee9;
  border-radius: 14px;
  background: #fff;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: .8rem 1rem;
  border: 0;
  border-radius: 10px;
  background: #111827;
  color: #fff;
  cursor: pointer;
}
.link { color: #2563eb; text-decoration: none; }
${raw}
</style>
</head>
<body>
  <div class="preview-wrap">
    <h2>Vista previa CSS</h2>
    <button class="btn">Botón de prueba</button>
    <div class="card">
      <h3>Tarjeta de prueba</h3>
      <p>Este bloque sirve para comprobar layout, tipografía, padding, borde, sombras y estados.</p>
      <a href="#" class="link">Enlace de ejemplo</a>
    </div>
  </div>
</body>
</html>`;
    }

    if (lang === "js") {
      return `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body {
  margin: 0;
  padding: 20px;
  background: #1e1e1e;
  color: #d4d4d4;
  font: 14px/1.6 Consolas, Monaco, monospace;
}
#console {
  display: grid;
  gap: 8px;
}
.log-line { white-space: pre-wrap; }
.log-prefix { color: #569cd6; }
.log-error { color: #f14c4c; }
</style>
</head>
<body>
  <div id="console"></div>
  <script>
    const box = document.getElementById('console');
    const print = (text, cls = '') => {
      const row = document.createElement('div');
      row.className = 'log-line ' + cls;
      row.innerHTML = '<span class="log-prefix">></span> ' + text;
      box.appendChild(row);
    };

    console.log = (...args) => print(args.join(' '));
    console.error = (...args) => print(args.join(' '), 'log-error');
    window.onerror = (msg) => print('ERROR: ' + msg, 'log-error');

    try {
      ${raw}
    } catch (err) {
      print('ERROR: ' + err.message, 'log-error');
    }
  <\/script>
</body>
</html>`;
    }

    return raw;
  }
};