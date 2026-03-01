(() => {

const input = document.getElementById("searchPageInput");
const results = document.getElementById("searchPageResults");

if(!input || !results) return;

const lang = window.location.pathname.startsWith("/en/") ? "en" : "es";

let index = [];

fetch("/assets/data/search.json")
.then(r => r.json())
.then(data => {
  index = data.filter(p => p.lang === lang);

  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");

  if(q){
    input.value = q;
    runSearch(q);
  }
});

input.addEventListener("input", e=>{
  const q = e.target.value;
  runSearch(q);
});

function runSearch(q){

  q = q.toLowerCase().trim();

  if(q.length < 2){
    results.innerHTML = "";
    return;
  }

  const hits = index.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.excerpt.toLowerCase().includes(q) ||
    p.tags.join(" ").includes(q)
  );

  if(!hits.length){
    results.innerHTML = "<p>No se encontraron resultados</p>";
    return;
  }

  results.innerHTML = hits.map(p => `
  <article class="card">
    <h2><a href="/${lang}/${p.url}">${p.title}</a></h2>
    <p>${p.excerpt}</p>
  </article>
  `).join("");

}

})();