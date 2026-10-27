#!/usr/bin/env node
// Execute the browser engine without a DOM and compare with real Java test output.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'src/main/resources/cocktails.json'), 'utf8'));
const contract = JSON.parse(await fs.readFile(path.join(root, 'target/demo-contract.json'), 'utf8'));
const context = vm.createContext({ window: { COCKTAIL_BFS_MODE: 'demo' },
  fetch: async url => { assert.equal(url, 'cocktails.json'); return { ok: true, json: async () => catalog }; }
});
vm.runInContext(await fs.readFile(path.join(root, 'src/main/resources/static/engine.js'), 'utf8'), context);
const engine = await new context.window.CocktailEngine().init();
const plain = value => JSON.parse(JSON.stringify(value));
for (const { options, expected } of contract.searches) assert.deepEqual(plain(await engine.discover(options)), expected);
for (const { from, to, expected } of contract.paths) assert.deepEqual(plain(await engine.path(from, to)), expected);
for (const { type, prefix, expected } of contract.prefixes) assert.deepEqual(plain(await engine.suggest(prefix, type)), expected);
console.log(`Demo parity passed: ${contract.searches.length} searches, ${contract.paths.length} BFS paths/traces, ${contract.prefixes.length} Trie queries match Java.`);
