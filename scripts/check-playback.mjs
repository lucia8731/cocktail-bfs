#!/usr/bin/env node
import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await fs.readFile(path.join(root, 'target/demo-contract.json'), 'utf8'));
const context = vm.createContext({window:{}});
vm.runInContext(await fs.readFile(path.join(root, 'src/main/resources/static/graph-state.js'), 'utf8'),context);
const Playback = context.window.GraphPlayback;
const plain = value => JSON.parse(JSON.stringify(value));
let snapshots = 0;
for (const {from, expected: result} of contract.paths) {
  const initial = Playback.at(result,from,0);
  assert.equal(initial.current,null);
  assert.deepEqual(plain(initial.queue),[from]);
  assert.deepEqual([...initial.visited],[from]);
  assert.equal(initial.parents.size,0);
  const visited = new Set([from]);
  for (let step = 1; step <= result.trace.length; step++) {
    const visit = result.trace[step-1];
    const state = Playback.at(result,from,step);
    visit.discovered.forEach(id => visited.add(id));
    assert.deepEqual(plain(state.queue),visit.queue);
    assert.deepEqual([...state.visited],[...visited]);
    assert.equal(state.current,visit.current);
    for (const id of state.queue) assert.ok(state.visited.has(id));
    for (const [child,parent] of state.parents) {
      assert.ok(state.visited.has(child));
      assert.ok(state.processed.has(parent));
      assert.notEqual(child,from);
    }
    assert.equal(state.parents.size,state.visited.size-1);
    assert.equal(state.complete,step===result.trace.length);
    snapshots++;
  }
  const end = Playback.at(result,from,999);
  assert.equal(end.step,result.trace.length);
  assert.equal(end.visited.size,result.visited);
  // Rewinding must discard future discoveries and parent links, without mutating the result.
  const rewind = Playback.at(result,from,-1);
  assert.deepEqual([...rewind.visited],[from]);
  assert.equal(rewind.parents.size,0);
  assert.equal(result.trace.length,end.step);
}
console.log(`Playback passed: ${snapshots} snapshots across ${contract.paths.length} Java BFS traces, including rewind and bounds.`);
