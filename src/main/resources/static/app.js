'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const titleCase = s => s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
const presets = {
  house: ['gin', 'lime juice', 'lemon juice', 'simple syrup', 'soda water'],
  agave: ['tequila', 'mezcal', 'lime juice', 'triple sec', 'orange juice'],
  zero: ['lime juice', 'simple syrup', 'mint', 'soda water']
};
let engine, pantry = new Set(presets.house), tag = 'all', searchSequence = 0, suggestionSequence = 0, ingredientSequence = 0, probeSequence = 0;
let lastResult, lastPath, toastTimer, currentTab = 'discover', activeRecipe, pathSequence = 0;
let saved;
try { saved = new Set(JSON.parse(localStorage.getItem('last-call:saved') || '[]')); } catch { saved = new Set(); }
let drawingId = 0;
function glassSVG(recipe, hero = false) {
  const id = `glass-${++drawingId}`;
  const color = recipe.color;
  const isTall = recipe.glass === 'highball', isRocks = recipe.glass === 'rocks';
  const outline = hero ? '#d1e1bc' : '#526c50';
  const opacity = hero ? '.65' : '.6';
  const bowl = isTall ? 'M111 60 L123 205 Q150 220 177 205 L189 60 Z' : isRocks ? 'M101 112 L113 202 Q150 217 187 202 L199 112 Z' : recipe.glass === 'martini' ? 'M70 73 L150 165 L230 73 Z' : 'M65 78 Q73 158 150 161 Q227 158 235 78 Z';
  const liquid = isTall ? 'M116 90 L126 202 Q150 214 174 202 L184 90 Z' : isRocks ? 'M107 137 L117 199 Q150 211 183 199 L193 137 Z' : recipe.glass === 'martini' ? 'M86 87 L150 160 L214 87 Z' : 'M75 95 Q92 158 150 156 Q208 158 225 95 Z';
  const stem = isTall || isRocks ? '' : '<path d="M150 162 V232 M119 234 Q150 229 181 234" fill="none" stroke-width="2"/>';
  const garnishY = isTall ? 75 : isRocks ? 124 : 83;
  return `<svg viewBox="0 0 300 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of ${escapeHTML(recipe.name)}"><defs><linearGradient id="${id}" x1="0" x2=".8" y1="0" y2="1"><stop stop-color="${color}" stop-opacity=".9"/><stop offset="1" stop-color="${color}" stop-opacity=".5"/></linearGradient><pattern id="${id}-dots" width="17" height="17" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".7" fill="${outline}" opacity=".18"/></pattern></defs><circle cx="150" cy="137" r="100" fill="url(#${id}-dots)"/><ellipse cx="150" cy="249" rx="65" ry="8" fill="${hero ? '#0f2d27' : '#718468'}" opacity=".12"/><g stroke="${outline}" stroke-opacity="${opacity}" stroke-linejoin="round"><path d="${bowl}" fill="${hero ? '#dbe8d110' : '#ffffff45'}" stroke-width="1.5"/><path d="${liquid}" fill="url(#${id})" stroke="none"/>${stem}<path d="${isTall ? 'M111 60Q150 70 189 60' : isRocks ? 'M101 112Q150 124 199 112' : 'M65 78Q150 93 235 78'}" fill="none" stroke-width="1.3"/>${isTall || isRocks ? '<path d="M131 118l25 4-3 24-25-4zm25 35l22-4 4 23-23 4" fill="#ffffee45" stroke="#ffffdd70"/>' : '<path d="M83 101Q97 135 123 141" fill="none" stroke="#ffffdf" stroke-width="3" stroke-linecap="round" opacity=".5"/>'}</g><g transform="translate(${isTall ? 182 : isRocks ? 191 : 217} ${garnishY}) rotate(24)"><circle r="24" fill="${hero ? '#a9be62' : '#98aa61'}" stroke="${outline}" stroke-width="1"/><circle r="20" fill="${hero ? '#dbe894' : '#e1e7a5'}"/><circle r="2" fill="#f1f2ce"/><path d="M0-18V18M-18 0H18M-13-13L13 13M-13 13L13-13" stroke="#a8b677" stroke-width="1"/></g>${hero ? '<g fill="#d9ec99"><path d="M55 45v20m-10-10h20" stroke="#d9ec99" stroke-width="1"/><circle cx="250" cy="185" r="2"/><path d="M68 205v10m-5-5h10" stroke="#d9ec99"/></g>' : ''}</svg>`;
}
function toast(message) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200);
}
function setTab(tab) {
  currentTab = tab;
  $$('.view').forEach(v => { v.hidden = v.id !== `${tab}-view`; });
  $$('.tabs button').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'); });
  $('#page-label').textContent = { discover: 'DISCOVERY', graph: 'RECIPE GRAPH', lab: 'UNDER THE HOOD', saved: 'SAVED RECIPES' }[tab];
  if (tab === 'graph' && !lastPath) findPath();
  if (tab === 'lab') { renderMetrics(); probeTrie(); }
  if (tab === 'saved') renderSaved();
}
function renderPantry() {
  $('#pantry-count').textContent = pantry.size;
  $('#pantry-chips').innerHTML = [...pantry].map(i => `<button class="ingredient-chip" data-remove="${escapeHTML(i)}" aria-label="Remove ${escapeHTML(i)}">${escapeHTML(titleCase(i))}<span aria-hidden="true">×</span></button>`).join('');
  $$('.preset').forEach(b => b.classList.toggle('active', presets[b.dataset.preset].length === pantry.size && presets[b.dataset.preset].every(i => pantry.has(i))));
  if (activeRecipe && $('#recipe-dialog').open) renderRecipe(activeRecipe);
}
function cardHTML(match, index) {
  const { cocktail: c, missing, coverage } = match;
  const ready = missing.length === 0;
  const color = c.base === 'mezcal' || c.base === 'whiskey' ? '#f0e4d4' : c.base === 'vodka' ? '#efe4e5' : '#e7ecdd';
  return `<article class="cocktail-card" style="--card-bg:${color}"><button class="card-save ${saved.has(c.id) ? 'saved' : ''}" data-save="${c.id}" aria-label="${saved.has(c.id) ? 'Unsave' : 'Save'} ${escapeHTML(c.name)}" aria-pressed="${saved.has(c.id)}">${saved.has(c.id) ? '♥' : '♡'}</button><button class="card-art" data-recipe="${c.id}" aria-label="Open ${escapeHTML(c.name)} recipe"><span class="card-serial">NO. ${String(engine.cocktails.findIndex(recipe => recipe.id === c.id) + 1 || index + 1).padStart(2, '0')}</span>${glassSVG(c)}</button><div class="card-content"><div class="card-meta"><span>${escapeHTML(c.base.replace('-', ' '))}</span><span>${escapeHTML(c.family)}</span></div><h3><button data-recipe="${c.id}">${escapeHTML(c.name)}</button></h3><p>${escapeHTML(c.description)}</p><div class="match-row"><span class="match-badge ${ready ? 'ready' : ''}"><i class="match-dot"></i>${ready ? 'Ready to make' : `${Math.round(coverage * 100)}% match`}</span><span>${ready ? 'All ingredients ✓' : `${missing.length} missing`} <span class="recipe-arrow">↗</span></span></div></div></article>`;
}
function matchFor(c) {
  const matched = c.ingredients.filter(i => pantry.has(i)), missing = c.ingredients.filter(i => !pantry.has(i));
  return { cocktail: c, matched, missing, coverage: matched.length / c.ingredients.length };
}
async function discover() {
  if (!engine) return;
  const sequence = ++searchSequence;
  $('#results').classList.add('loading');
  try {
    const result = await engine.discover({ pantry: [...pantry], query: $('#search').value, base: $('#base-filter').value, tag, readyOnly: $('#ready-only').checked, k: Number($('#top-k').value) });
    if (sequence !== searchSequence) return;
    lastResult = result;
    $('#result-count').textContent = `${result.results.length} ${result.results.length === 1 ? 'cocktail' : 'cocktails'} for your shelf`;
    $('#results').innerHTML = result.results.length ? result.results.map(cardHTML).join('') : '<div class="empty-state"><h3>No pours just yet.</h3><p>Try a different flavor, add ingredients, or explore the full catalog.</p><button class="primary-button" data-reset-filters>Reset filters</button></div>';
    renderMetrics();
  } catch (error) {
    if (sequence === searchSequence) {
      $('#results').innerHTML = `<div class="error-message"><strong>Couldn’t reach the engine.</strong><p>${escapeHTML(error.message)}</p><button class="primary-button" data-retry>Try again</button></div>`;
      $('#result-count').textContent = 'Search unavailable';
    }
  } finally { if (sequence === searchSequence) $('#results').classList.remove('loading'); }
}
function renderMetrics() {
  if (!lastResult) return;
  const m = lastResult.metrics;
  $('#quick-metrics').textContent = `${m.candidates}/${m.catalogSize} candidates · ${m.ingredientChecks} set lookups · heap ≤ ${m.k}`;
  $('#index-demo').innerHTML = (m.indexHits.length ? m.indexHits.slice(0, 4).map(i => `<div class="index-entry"><span>${escapeHTML(i)}</span><span>→ ${engine.index.get(i).size} recipes</span></div>`).join('') : '<div class="index-entry">Empty shelf → browse all recipes</div>') + `<div class="index-entry"><strong>Union of recipe IDs</strong><span>${m.candidates} / ${m.catalogSize}</span></div>`;
  $('#heap-demo').innerHTML = `<div class="heap-numbers"><div><strong>${m.heapOffers}</strong><span>CONSIDERED</span></div><div><strong>${m.maxHeapSize}</strong><span>RETAINED</span></div><div><strong>${m.heapEvictions}</strong><span>REPLACED</span></div></div><div class="heap-bar"><span style="width:${m.maxHeapSize / m.k * 100}%"></span></div><div class="trie-stats">Peak size ${m.maxHeapSize} / ${m.k} · O(C × I + C log K + K log K)</div>`;
}
function persistSaved() {
  try { localStorage.setItem('last-call:saved', JSON.stringify([...saved])); } catch { toast('Browser storage is unavailable. Saves last for this session.'); }
  $('#saved-count').textContent = saved.size;
}
function toggleSave(id) {
  if (saved.has(id)) { saved.delete(id); toast('Removed from your little black book.'); }
  else { saved.add(id); toast('Saved for another round.'); }
  persistSaved();
  $$(`[data-save="${id}"]`).forEach(b => {
    b.classList.toggle('saved', saved.has(id)); b.setAttribute('aria-pressed', String(saved.has(id)));
    if (b.classList.contains('card-save')) { b.textContent = saved.has(id) ? '♥' : '♡'; b.setAttribute('aria-label', `${saved.has(id) ? 'Unsave' : 'Save'} ${engine.byId.get(id).name}`); }
    else b.textContent = saved.has(id) ? '♥ Saved to your recipes' : '♡ Save this recipe';
  });
  if (currentTab === 'saved') renderSaved();
}
function renderSaved() {
  const recipes = [...saved].map(id => engine.byId.get(id)).filter(Boolean);
  $('#saved-results').innerHTML = recipes.length ? recipes.map(c => matchFor(c)).map(cardHTML).join('') : '<div class="empty-state"><h3>The first round is on you.</h3><p>Tap the heart on a cocktail to keep it here.</p><button class="primary-button" data-browse>Discover recipes ↗</button></div>';
}
function renderRecipe(id) {
  const c = engine.byId.get(id); if (!c) return;
  activeRecipe = id;
  $('#recipe-detail').innerHTML = `<div class="recipe-layout"><div class="detail-art">${glassSVG(c)}<span>${escapeHTML(c.family.toUpperCase())} / ${escapeHTML(c.base.toUpperCase())}</span></div><div class="detail-body"><span class="eyebrow dark">THE RECIPE</span><h2>${escapeHTML(c.name)}</h2><p>${escapeHTML(c.description)}</p><h4>THE INGREDIENTS</h4>${c.ingredients.map((i, n) => `<div class="ingredient-row"><span class="${pantry.has(i) ? 'have' : ''}">${pantry.has(i) ? '✓ ' : '＋ '}${escapeHTML(titleCase(i))}</span><span>${escapeHTML(c.measures[n])}</span></div>`).join('')}<h4>MAKE IT YOURS</h4><ol>${c.steps.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ol><button class="primary-button" data-save="${c.id}" aria-pressed="${saved.has(c.id)}">${saved.has(c.id) ? '♥ Saved to your recipes' : '♡ Save this recipe'}</button><p class="recipe-disclaimer">HOUSE SPECS · CORE INGREDIENTS ONLY<br>Ice and optional garnish are not included in shelf matching. Egg-free sour variations.</p></div></div>`;
}
function openRecipe(id) { renderRecipe(id); if (!$('#recipe-dialog').open) $('#recipe-dialog').showModal(); }
async function showSuggestions(input, target, type, sequence) {
  const prefix = input.value.trim();
  if (!prefix) { target.hidden = true; return; }
  try {
    const result = await engine.suggest(prefix, type);
    if (sequence !== (type === 'ingredients' ? ingredientSequence : suggestionSequence)) return;
    const words = result.words.filter(w => type !== 'ingredients' || !pantry.has(w));
    target.innerHTML = words.length ? words.map(w => `<button data-suggest-type="${type}" data-suggest="${escapeHTML(w)}">${escapeHTML(type === 'ingredients' ? titleCase(w) : w)}</button>`).join('') : '<div class="no-suggestion">No matching suggestions</div>';
    target.hidden = false;
  } catch (error) { target.hidden = true; toast(error.message); }
}
async function probeTrie() {
  if (!engine) return;
  const sequence = ++probeSequence;
  try {
    const result = await engine.suggest($('#trie-probe').value);
    if (sequence !== probeSequence) return;
    $('#trie-result').innerHTML = `<div class="trie-output">${result.words.map(w => `<span>${escapeHTML(w)}</span>`).join('') || '<span>No matching subtree</span>'}</div><div class="trie-stats">${result.prefixSteps} prefix steps · ${result.nodesVisited} subtree nodes visited</div>`;
  } catch (error) { $('#trie-result').textContent = error.message; }
}
function drawGraph(path = []) {
  const w = 900, h = 510, positions = new Map();
  // Fixed rings keep the view stable when a route changes, making comparison easy.
  const inner = engine.cocktails.filter(c => ['gin-sour','gimlet','whiskey-sour','tequila-sour','daiquiri','white-lady','kamikaze','old-fashioned'].includes(c.id));
  const outer = engine.cocktails.filter(c => !inner.includes(c));
  [inner, outer].forEach((ring, n) => ring.forEach((c, i) => {
    const angle = 2 * Math.PI * i / ring.length - Math.PI / 2;
    positions.set(c.id, { x: w / 2 + Math.cos(angle) * (n ? 354 : 168), y: h / 2 + Math.sin(angle) * (n ? 202 : 102) });
  }));
  const pathEdges = new Set(path.slice(1).map((id, i) => [path[i], id].sort().join('|')));
  $('#graph-canvas').innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="Recipe graph with ${engine.cocktails.length} cocktails and ${engine.edges.length} ingredient connections">${engine.edges.map(e => {
    const a = positions.get(e.source), b = positions.get(e.target);
    return `<line class="graph-edge ${pathEdges.has([e.source, e.target].sort().join('|')) ? 'path-edge' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
  }).join('')}${engine.cocktails.map(c => {
    const p = positions.get(c.id);
    return `<g class="graph-node ${path.includes(c.id) ? 'path-node' : ''}" data-recipe="${c.id}" tabindex="0" role="button" aria-label="Open ${escapeHTML(c.name)}" transform="translate(${p.x} ${p.y})"><circle r="${path.includes(c.id) ? 10 : 7}"/><text text-anchor="middle" y="${p.y > h - 90 ? -17 : 25}">${escapeHTML(c.name)}</text></g>`;
  }).join('')}</svg>`;
}
async function findPath() {
  if (!engine) return;
  const sequence = ++pathSequence;
  $('#find-path').disabled = true;
  try {
    const result = await engine.path($('#path-from').value, $('#path-to').value);
    if (sequence !== pathSequence) return;
    lastPath = result;
    const name = id => engine.byId.get(id).name;
    drawGraph(result.path);
    $('#path-result').innerHTML = `<div class="path-summary"><h3>${result.path.length ? result.path.length === 1 ? 'You’re already there.' : `${result.path.length - 1} hops. One delicious connection.` : 'Different islands of flavor.'}</h3><div class="path-chain">${result.path.length ? result.path.map((id, i) => `${i ? '<span>→</span>' : ''}<button data-recipe="${id}">${escapeHTML(name(id))}</button>`).join('') : '<p>No route exists under the two-shared-ingredients rule. Try Gin Sour → Negroni.</p>'}</div><p class="path-detail">${result.path.length > 1 ? result.path.slice(1).map((id, i) => {
      const previous = engine.byId.get(result.path[i]);
      const common = previous.ingredients.filter(x => engine.byId.get(id).ingredients.includes(x));
      return `${escapeHTML(previous.name)} → ${escapeHTML(name(id))}: ${common.map(escapeHTML).join(' + ')}`;
    }).join('<br>') : 'BFS explores the graph level by level. Isolated recipes are a valid result.'}</p></div>`;
    $('#bfs-metrics').textContent = `${result.visited} discovered · ${result.edgesExamined} edges examined`;
    $('#bfs-trace').innerHTML = result.trace.map((v, i) => `<div class="trace-row"><span>${String(i + 1).padStart(2, '0')}</span><span>${escapeHTML(name(v.current))}</span><span><small>QUEUE → </small>${v.queue.length ? v.queue.map(id => escapeHTML(name(id))).join(' · ') : '∅'}${v.discovered.length ? `<br><small>NEW → </small>${v.discovered.map(id => escapeHTML(name(id))).join(' · ')}` : ''}</span></div>`).join('');
  } catch (error) { toast(`Path unavailable: ${error.message}`); }
  finally { if (sequence === pathSequence) $('#find-path').disabled = false; }
}
function debounce(fn, wait = 170) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; }
function resetFilters() {
  $('#search').value = ''; $('#base-filter').value = 'all'; $('#ready-only').checked = false; tag = 'all';
  $$('.vibe').forEach(b => b.classList.toggle('active', b.dataset.tag === 'all'));
  discover();
}
async function init() {
  try {
    engine = await new CocktailEngine().init();
    // Discard stale saved IDs if the catalog changes.
    saved = new Set([...saved].filter(id => engine.byId.has(id))); persistSaved();
    $('#runtime').textContent = engine.mode === 'api' ? 'Java API connected' : 'Interactive browser demo';
    $('#runtime-explanation').innerHTML = engine.mode === 'api' ? '<strong>Java engine connected.</strong> Search, autocomplete, ranking, and path queries run through the Spring Boot REST API. This panel shows the operations reported by Java.' : '<strong>You’re exploring the browser demo.</strong> This public version runs equivalent JavaScript algorithms on the shared catalog. The repository contains the Java 17 / Spring Boot application, tests, and a Dockerfile. The demo does not call a hosted Java server.';
    $('#hero-art').innerHTML = glassSVG(engine.byId.get('gimlet'), true);
    const options = engine.cocktails.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
    $('#path-from').innerHTML = options; $('#path-to').innerHTML = options;
    $('#path-from').value = 'margarita'; $('#path-to').value = 'negroni';
    renderPantry(); drawGraph(); await discover(); probeTrie();
    $('#ingredient-search').addEventListener('input', debounce(() => showSuggestions($('#ingredient-search'), $('#ingredient-suggestions'), 'ingredients', ++ingredientSequence)));
    $('#ingredient-search').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const exact = engine.ingredients.find(i => i === e.target.value.trim().toLowerCase());
        if (exact) { pantry.add(exact); e.target.value = ''; $('#ingredient-suggestions').hidden = true; renderPantry(); discover(); }
        else $('#ingredient-suggestions button')?.click();
      }
    });
    $('#search').addEventListener('input', debounce(() => { discover(); showSuggestions($('#search'), $('#cocktail-suggestions'), 'cocktails', ++suggestionSequence); }));
    $('#search').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') $('#cocktail-suggestions').hidden = true; });
    ['#base-filter', '#ready-only', '#top-k'].forEach(s => $(s).addEventListener('change', discover));
    $('#trie-probe').addEventListener('input', debounce(probeTrie));
    $('#find-path').addEventListener('click', findPath);
    $('#path-from').addEventListener('change', findPath); $('#path-to').addEventListener('change', findPath);
    $('#swap-path').addEventListener('click', () => { const from = $('#path-from').value; $('#path-from').value = $('#path-to').value; $('#path-to').value = from; findPath(); });
    $('#clear-pantry').addEventListener('click', () => { pantry.clear(); renderPantry(); discover(); });
    $('#surprise').addEventListener('click', () => {
      const choices = lastResult?.results.length ? lastResult.results.map(r => r.cocktail) : engine.cocktails;
      openRecipe(choices[Math.floor(Math.random() * choices.length)].id);
    });
    $('#inspect-search').addEventListener('click', () => setTab('lab'));
    $('#go-graph').addEventListener('click', () => setTab('graph'));
    $('#close-dialog').addEventListener('click', () => $('#recipe-dialog').close());
    $('#recipe-dialog').addEventListener('click', e => { if (e.target === $('#recipe-dialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.suggestions').forEach(el => { el.hidden = true; }); });
    document.addEventListener('click', event => {
      const el = event.target.closest('[data-tab],[data-preset],[data-remove],[data-recipe],[data-save],[data-tag],[data-suggest],[data-browse],[data-reset-filters],[data-retry]');
      if (!event.target.closest('.ingredient-input,.cocktail-search')) $$('.suggestions').forEach(s => { s.hidden = true; });
      if (!el) return;
      if (el.dataset.tab) setTab(el.dataset.tab);
      if (el.dataset.preset) { pantry = new Set(presets[el.dataset.preset]); renderPantry(); discover(); }
      if (el.dataset.remove) { pantry.delete(el.dataset.remove); renderPantry(); discover(); }
      if (el.dataset.recipe) openRecipe(el.dataset.recipe);
      if (el.dataset.save) toggleSave(el.dataset.save);
      if (el.dataset.tag) { tag = el.dataset.tag; $$('.vibe').forEach(b => b.classList.toggle('active', b === el)); discover(); }
      if (el.dataset.suggest) {
        if (el.dataset.suggestType === 'ingredients') { pantry.add(el.dataset.suggest); $('#ingredient-search').value = ''; renderPantry(); }
        else $('#search').value = el.dataset.suggest;
        $$('.suggestions').forEach(s => { s.hidden = true; }); discover();
      }
      if (el.hasAttribute('data-browse')) setTab('discover');
      if (el.hasAttribute('data-reset-filters')) resetFilters();
      if (el.hasAttribute('data-retry')) discover();
    });
    document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.graph-node')) { e.preventDefault(); openRecipe(e.target.dataset.recipe); } });
  } catch (error) {
    $('#runtime').textContent = 'Engine unavailable';
    $('#result-count').textContent = 'Unable to load catalog';
    $('#results').innerHTML = `<div class="error-message"><strong>The cocktail engine couldn’t start.</strong><p>${escapeHTML(error.message)}</p><p>For the Java app, start Spring Boot and open http://localhost:8080.</p></div>`;
  }
}
init();
