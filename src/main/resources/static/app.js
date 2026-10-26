'use strict';
const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let engine, result, start, target, selected, step = 0, timer, requestId = 0, zoom = 1;
const name = id => engine.byId.get(id)?.name ?? id;
const token = id => `<span class="token">${escapeHTML(name(id))}</span>`;
const empty = '<span class="empty">∅</span>';

function stop() {
  clearInterval(timer); timer = null;
  $('#play').textContent = 'Play'; $('#play').setAttribute('aria-pressed', 'false');
}
function selectVertex(id) {
  if (!engine.byId.has(id)) return;
  selected = id;
  renderVertex();
  document.querySelectorAll('.node').forEach(node => node.classList.toggle('selected', node.dataset.vertex === id));
}
function renderVertex() {
  const recipe = engine.byId.get(selected);
  const neighbors = engine.adjacency.get(selected);
  $('#vertex-detail').innerHTML = `<div><span class="vertex-name">${escapeHTML(recipe.name)}</span><div class="ingredient-tags">${recipe.ingredients.map(i => `<span>${escapeHTML(i)}</span>`).join('')}</div></div><div><span class="vertex-section-label">Neighbors · ${neighbors.length}</span><div class="neighbors">${neighbors.map(id => `<button data-vertex="${id}">${escapeHTML(name(id))}</button>`).join('') || empty}</div></div>`;
}
function graphSVG(state) {
  const positions = new Map();
  // Stable positions preserve the same mental map during playback and endpoint changes.
  const innerIds = new Set(['gin-sour','gimlet','whiskey-sour','tequila-sour','daiquiri','white-lady','kamikaze','old-fashioned']);
  const inner = engine.cocktails.filter(c => innerIds.has(c.id));
  const outer = engine.cocktails.filter(c => !innerIds.has(c.id));
  [inner, outer].forEach((ring, outerRing) => ring.forEach((recipe, i) => {
    const angle = i * Math.PI * 2 / ring.length - Math.PI / 2;
    positions.set(recipe.id, {x: 500 + Math.cos(angle) * (outerRing ? 385 : 200), y: 325 + Math.sin(angle) * (outerRing ? 255 : 130)});
  }));
  const path = state.complete ? result.path : [];
  const pair = (a, b) => [a, b].sort().join('|');
  const routeEdges = new Set(path.slice(1).map((id, i) => pair(path[i], id)));
  const treeEdges = new Set([...state.parents].map(([child, parent]) => pair(child, parent)));
  const edges = engine.edges.map(edge => {
    const a = positions.get(edge.source), b = positions.get(edge.target), key = pair(edge.source, edge.target);
    const cls = routeEdges.has(key) ? 'path-edge' : treeEdges.has(key) ? 'tree-edge' : '';
    return `<line class="edge ${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"><title>${escapeHTML(name(edge.source))} ↔ ${escapeHTML(name(edge.target))}: ${edge.shared.map(escapeHTML).join(', ')}</title></line>`;
  }).join('');
  const nodes = engine.cocktails.map(recipe => {
    const p = positions.get(recipe.id), id = recipe.id;
    const classes = ['node', state.visited.has(id) && 'visited', state.queue.includes(id) && 'queued', path.includes(id) && 'in-path', state.current === id && 'current', selected === id && 'selected', id === start && 'start', id === target && 'destination'].filter(Boolean).join(' ');
    const anchor = p.x < 150 ? 'start' : p.x > 850 ? 'end' : 'middle';
    const x = p.x < 150 ? -12 : p.x > 850 ? 12 : 0;
    const y = p.y > 530 ? -20 : 26;
    return `<g class="${classes}" transform="translate(${p.x} ${p.y})" role="button" tabindex="0" data-vertex="${id}" aria-label="${escapeHTML(recipe.name)}${id === start ? ', start' : id === target ? ', destination' : ''}"><circle class="selection-ring" r="15"/><circle class="dot" r="9"/><text x="${x}" y="${y}" text-anchor="${anchor}">${escapeHTML(recipe.name)}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 1000 650" role="group" aria-label="Recipe graph. ${engine.cocktails.length} vertices, ${engine.edges.length} edges.">${edges}${nodes}</svg>`;
}
function render() {
  if (!result) return;
  const state = GraphPlayback.at(result, start, step);
  step = state.step;
  $('#graph').innerHTML = graphSVG(state);
  $('#current').textContent = state.current ? name(state.current) : '—';
  $('#queue').innerHTML = state.queue.map(token).join('') || empty;
  $('#queue-count').textContent = state.queue.length;
  $('#visited').innerHTML = [...state.visited].map(token).join('');
  $('#visited-count').textContent = state.visited.size;
  $('#parents').innerHTML = [...state.parents].map(([child, parent]) => `<div class="parent-row"><span>${escapeHTML(name(child))}</span><span>←</span><span>${escapeHTML(name(parent))}</span></div>`).join('') || empty;
  $('#step-label').textContent = `Step ${step} / ${result.trace.length}`;
  $('#timeline').max = result.trace.length; $('#timeline').value = step;
  $('#reset').disabled = step === 0; $('#back').disabled = step === 0;
  $('#next').disabled = state.complete; $('#end').disabled = state.complete;
  $('#path-length').textContent = state.complete && result.path.length ? `${result.path.length - 1} edges` : '';
  $('#path').innerHTML = state.complete ? result.path.length ? result.path.map((id, i) => `${i ? '<span>→</span>' : ''}<button data-vertex="${id}">${escapeHTML(name(id))}</button>`).join('') : '<span>No path</span>' : '<span>—</span>';
  document.querySelectorAll('#trace tr').forEach((row, i) => { row.classList.toggle('active', i + 1 === step); });
}
function setStep(value) { stop(); step = Number(value); render(); }
function play() {
  if (timer) { stop(); return; }
  if (step === result.trace.length) step = 0;
  $('#play').textContent = 'Pause'; $('#play').setAttribute('aria-pressed', 'true'); render();
  timer = setInterval(() => { step++; render(); if (step >= result.trace.length) stop(); }, 650);
}
function renderTrace() {
  $('#trace').innerHTML = result.trace.map((visit, i) => `<tr data-step="${i + 1}" tabindex="0" aria-label="Show step ${i + 1}"><td>${i + 1}</td><td>${escapeHTML(name(visit.current))}</td><td>${visit.discovered.map(id => escapeHTML(name(id))).join(', ') || '∅'}</td><td>${visit.queue.map(id => escapeHTML(name(id))).join(', ') || '∅'}</td></tr>`).join('');
}
function setBusy(busy) {
  ['#from','#to','#swap','#run','#play','#timeline'].forEach(selector => { $(selector).disabled = busy; });
  if (busy) ['#reset','#back','#next','#end'].forEach(selector => { $(selector).disabled = true; });
  $('.workspace').classList.toggle('loading', busy);
}
async function run(autoplay = false) {
  stop(); const sequence = ++requestId;
  const from = $('#from').value, to = $('#to').value;
  $('#error').hidden = true; setBusy(true);
  try {
    const next = await engine.path(from, to);
    if (sequence !== requestId) return;
    result = next; start = from; target = to; step = autoplay ? 0 : result.trace.length;
    selected = start; renderVertex(); renderTrace(); setBusy(false); render();
    const scroll = $('#graph-scroll');
    scroll.scrollLeft = Math.max(0, (scroll.scrollWidth - scroll.clientWidth) / 2);
    if (autoplay) play();
  } catch (error) {
    if (sequence !== requestId) return;
    $('#error').textContent = `Could not run BFS. ${error.message}`; $('#error').hidden = false;
    setBusy(false);
    if (result) render();
    else ['#play','#timeline'].forEach(selector => { $(selector).disabled = true; });
  }
}
function setZoom(value) {
  zoom = Math.max(1, Math.min(2, value));
  $('#graph').style.width = `${zoom * 100}%`;
  $('#zoom-out').disabled = zoom === 1; $('#zoom-in').disabled = zoom === 2;
}
async function init() {
  try {
    engine = await new CocktailEngine().init();
    const options = engine.cocktails.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
    $('#from').innerHTML = options; $('#to').innerHTML = options;
    $('#from').value = 'margarita'; $('#to').value = 'negroni';
    $('#edge-count').textContent = engine.edges.length;
    $('#runtime').textContent = engine.mode === 'api' ? 'Java / Spring Boot' : 'Browser demo · Java source on GitHub';
    $('#adjacency').innerHTML = engine.cocktails.map(c => `<div class="adjacency-row"><button data-vertex="${c.id}">${escapeHTML(c.name)}</button><span>[${engine.adjacency.get(c.id).map(id => escapeHTML(name(id))).join(', ')}]</span></div>`).join('');
    $('#path-form').addEventListener('submit', event => { event.preventDefault(); run(true); });
    $('#from').addEventListener('change', () => run()); $('#to').addEventListener('change', () => run());
    $('#swap').addEventListener('click', () => { const from = $('#from').value; $('#from').value = $('#to').value; $('#to').value = from; run(); });
    $('#reset').addEventListener('click', () => setStep(0)); $('#back').addEventListener('click', () => setStep(step - 1));
    $('#next').addEventListener('click', () => setStep(step + 1)); $('#end').addEventListener('click', () => setStep(result.trace.length));
    $('#play').addEventListener('click', play); $('#timeline').addEventListener('input', event => setStep(event.target.value));
    $('#zoom-in').addEventListener('click', () => setZoom(zoom + .25)); $('#zoom-out').addEventListener('click', () => setZoom(zoom - .25));
    document.addEventListener('click', event => {
      const vertex = event.target.closest('[data-vertex]'); if (vertex) selectVertex(vertex.dataset.vertex);
      const row = event.target.closest('[data-step]'); if (row) setStep(row.dataset.step);
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target.matches('.node')) { event.preventDefault(); selectVertex(event.target.dataset.vertex); }
      if (event.target.matches('[data-step]')) { event.preventDefault(); setStep(event.target.dataset.step); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    setZoom(1); await run();
  } catch (error) {
    $('#runtime').textContent = 'Engine unavailable'; $('#error').textContent = error.message; $('#error').hidden = false;
  }
}
init();
