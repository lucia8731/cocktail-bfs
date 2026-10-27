/* Browser demo parity layer. Spring Boot mode delegates all algorithms to Java.
 * The public static demo uses the same JSON catalog with explicit browser mode.
 * No network error is silently treated as a successful API result.
 */
'use strict';
class PrefixTrie {
  constructor(words) {
    this.root = { children: new Map(), word: null };
    for (const word of words) {
      let node = this.root;
      for (const letter of word.toLowerCase()) {
        if (!node.children.has(letter)) node.children.set(letter, { children: new Map(), word: null });
        node = node.children.get(letter);
      }
      node.word = word;
    }
  }
  suggest(prefix, limit = 8) {
    let node = this.root, prefixSteps = 0, nodesVisited = 0;
    for (const letter of prefix.trim().toLowerCase()) {
      prefixSteps++;
      node = node.children.get(letter);
      if (!node) return { words: [], prefixSteps, nodesVisited };
    }
    const words = [];
    const collect = current => {
      if (words.length >= limit) return;
      nodesVisited++;
      if (current.word) words.push(current.word);
      for (const letter of [...current.children.keys()].sort()) {
        if (words.length >= limit) break;
        collect(current.children.get(letter));
      }
    };
    collect(node);
    return { words, prefixSteps, nodesVisited };
  }
}
// A min-heap whose root is the worst retained match. It never exceeds K entries.
class BoundedHeap {
  constructor(k, compare) { this.k = k; this.compare = compare; this.items = []; this.evictions = 0; }
  offer(value) {
    const a = this.items;
    if (a.length < this.k) {
      a.push(value);
      let i = a.length - 1;
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (this.compare(a[i], a[parent]) <= 0) break;
        [a[i], a[parent]] = [a[parent], a[i]]; i = parent;
      }
    } else if (this.compare(value, a[0]) < 0) {
      a[0] = value; this.evictions++;
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let worst = i * 2 + 1;
        if (worst + 1 < a.length && this.compare(a[worst + 1], a[worst]) > 0) worst++;
        if (this.compare(a[worst], a[i]) <= 0) break;
        [a[i], a[worst]] = [a[worst], a[i]]; i = worst;
      }
    }
  }
}
class CocktailEngine {
  async init() {
    this.mode = window.COCKTAIL_BFS_MODE === 'demo' ? 'demo' : 'api';
    if (this.mode === 'api') {
      const data = await this.request('api/catalog');
      this.cocktails = data.cocktails; this.ingredients = data.ingredients; this.edges = data.edges;
    } else {
      this.cocktails = await this.request('cocktails.json');
      this.ingredients = [...new Set(this.cocktails.flatMap(r => r.ingredients))].sort();
    }
    this.byId = new Map(this.cocktails.map(r => [r.id, r]));
    this.index = new Map(this.ingredients.map(name => [name, new Set()]));
    for (const r of this.cocktails) for (const i of r.ingredients) this.index.get(i).add(r.id);
    this.names = new PrefixTrie(this.cocktails.map(r => r.name));
    this.ingredientTrie = new PrefixTrie(this.ingredients);
    this.adjacency = new Map(this.cocktails.map(r => [r.id, []]));
    if (this.mode === 'demo') {
      this.edges = [];
      this.cocktails.forEach((a, i) => this.cocktails.slice(i + 1).forEach(b => {
        const shared = a.ingredients.filter(x => b.ingredients.includes(x));
        if (shared.length >= 2) this.edges.push({ source: a.id, target: b.id, shared });
      }));
    }
    for (const edge of this.edges) {
      this.adjacency.get(edge.source).push(edge.target);
      this.adjacency.get(edge.target).push(edge.source);
    }
    return this;
  }
  async request(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      let message = `Request failed (${response.status}).`;
      try { message = (await response.json()).detail || message; } catch { /* Preserve HTTP status. */ }
      throw new Error(message);
    }
    return response.json();
  }
  async suggest(prefix, type = 'cocktails') {
    if (this.mode === 'api') return this.request(`api/suggest?${new URLSearchParams({ prefix, type })}`);
    return (type === 'ingredients' ? this.ingredientTrie : this.names).suggest(prefix);
  }
  async discover(options) {
    if (this.mode === 'api') return this.request('api/discover', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options)
    });
    const { query, base, tag, readyOnly, k } = options;
    const pantry = new Set(options.pantry);
    const candidates = pantry.size ? new Set([...pantry].sort().flatMap(i => [...(this.index.get(i) || [])])) : new Set(this.cocktails.map(r => r.id));
    const compare = (a, b) => b.coverage - a.coverage || a.missing.length - b.missing.length || (a.cocktail.name < b.cocktail.name ? -1 : a.cocktail.name > b.cocktail.name ? 1 : 0);
    const heap = new BoundedHeap(k, compare);
    let ingredientChecks = 0, heapOffers = 0;
    for (const id of candidates) {
      const cocktail = this.byId.get(id);
      if (!cocktail.name.toLowerCase().includes(query.trim().toLowerCase())) continue;
      if (base !== 'all' && cocktail.base !== base) continue;
      if (tag !== 'all' && !cocktail.tags.includes(tag)) continue;
      const matched = [], missing = [];
      for (const ingredient of cocktail.ingredients) {
        ingredientChecks++;
        (pantry.has(ingredient) ? matched : missing).push(ingredient);
      }
      if (readyOnly && missing.length) continue;
      heapOffers++;
      heap.offer({ cocktail, matched, missing, coverage: matched.length / cocktail.ingredients.length });
    }
    return { results: heap.items.sort(compare), metrics: {
      candidates: candidates.size, catalogSize: this.cocktails.length, ingredientChecks, heapOffers,
      heapEvictions: heap.evictions, maxHeapSize: heap.items.length, k, indexHits: [...pantry].sort()
    } };
  }
  async path(from, to) {
    if (this.mode === 'api') return this.request(`api/path?${new URLSearchParams({ from, to })}`);
    const queue = [from], visited = new Set([from]), parent = new Map(), trace = [];
    let head = 0, edgesExamined = 0;
    while (head < queue.length) {
      const current = queue[head++], discovered = [];
      if (current !== to) for (const neighbor of this.adjacency.get(current)) {
        edgesExamined++;
        if (!visited.has(neighbor)) {
          visited.add(neighbor); parent.set(neighbor, current); queue.push(neighbor); discovered.push(neighbor);
        }
      }
      trace.push({ current, queue: queue.slice(head), discovered });
      if (current === to) {
        const path = [];
        for (let at = to; at !== undefined; at = parent.get(at)) path.unshift(at);
        return { path, trace, visited: visited.size, edgesExamined };
      }
    }
    return { path: [], trace, visited: visited.size, edgesExamined };
  }
}
window.CocktailEngine = CocktailEngine;
