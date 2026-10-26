# Verification

Current interface: a single white-and-green Graph / BFS workspace. No Discover page, saved favorites, decorative illustrations, or marketing headings.

| Check | Result |
|---|---|
| `mvn verify` | Passed; 31 Java test invocations, no failures or errors |
| Heap vs full-sort oracle (retained API) | 400 seeded cases passed |
| BFS vs Floyd–Warshall | All 576 ordered recipe pairs passed |
| Browser/Java contract | 120 searches, 576 paths/traces, 14 Trie queries match |
| Playback state | 6,901 snapshots across 576 traces passed, including rewind and bounds |
| Browser interactions | Reset, Next, Back, Play/Pause, same-node path, unreachable path, endpoint changes, vertex selection |
| Layout | Desktop and 390px frame; horizontal scrolling is confined to graph/table containers |

The initial graph displays the completed default path. Reset moves to the initial queue; Run BFS computes and animates a new search. Current identifies the node processed at the selected step. Queue and Visited count discovered nodes; Parent contains one predecessor for every discovered non-start node. The path is hidden until the terminal step.

`check-playback.mjs` validates replay against Java-generated traces, not a second invocation of the UI. The pure playback model does not mutate recorded snapshots. Manual browser checks complement the Java/API and Node tests; they are not a full automated browser suite.

Docker execution, production load testing, hosted JVM service, and performance improvements over simpler scans are not claimed. The public build runs the browser engine, explicitly labeled in the footer.
