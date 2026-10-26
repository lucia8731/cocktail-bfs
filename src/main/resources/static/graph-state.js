'use strict';
/** Replay Java's queue snapshots without rerunning the search or predicting future state. */
class GraphPlayback {
  static at(result, start, step) {
    const count = Math.max(0, Math.min(result.trace.length, Math.trunc(step)));
    const visited = new Set([start]);
    const parents = new Map();
    const processed = new Set();
    for (const visit of result.trace.slice(0, count)) {
      processed.add(visit.current);
      for (const id of visit.discovered) {
        visited.add(id);
        parents.set(id, visit.current);
      }
    }
    const last = result.trace[count - 1];
    return { step: count, current: last?.current ?? null,
      queue: last ? last.queue.slice() : [start], visited, parents, processed,
      complete: count === result.trace.length };
  }
}
window.GraphPlayback = GraphPlayback;
