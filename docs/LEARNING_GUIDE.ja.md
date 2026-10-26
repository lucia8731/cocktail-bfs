# Graph / BFS 学習ガイド

24種類のカクテルを頂点、共通材料が2つ以上ある関係を辺として、BFSを試すアプリです。Java本体はSpring Boot、公開デモは同じ結果を返すブラウザ版です。AI支援で作成しています。

## 操作とコードをつなぐ

1. `mvn spring-boot:run` → `http://localhost:8080`。下部に **Java / Spring Boot** と表示されることを確認する。
2. **Reset**。Queueに開始頂点だけが入り、Visitedにも開始頂点だけが入る。Parentは空。
3. **Next**。Queueの先頭を取り出し、その頂点の未発見の隣接頂点をQueueの末尾へ入れる。
4. 新しく入れた頂点は、その場でVisitedへ追加する。Parentには「新しい頂点 → 今の頂点」を保存する。
5. **Back**で戻り、未来のVisited・Parentが消えることを確認する。
6. **End**で最後へ進む。目的地に到達できた場合はParentを逆にたどって最短経路を作る。

## 4つの構造

| 画面 | Java | 役割 |
|---|---|---|
| Adjacency list | `Map<String, List<String>>` | 頂点ごとの隣接頂点一覧 |
| Queue | `ArrayDeque<String>` | 先入れ先出し（FIFO）の探索待ち頂点 |
| Visited | `LinkedHashSet<String>` | 発見済み頂点。重複を防ぎ、発見順を保持 |
| Parent | `HashMap<String, String>` | その頂点を最初に発見した元の頂点 |

**Visitedは「処理完了」ではなく「発見済み」です。** Queueに入れた時点でVisitedに登録します。Queueに残っている頂点もVisitedに含まれます。

## 読む順番

- `model/Cocktail.java`：頂点になるレシピのデータ。
- `catalog/CocktailCatalog.java`：JSON読込とグラフの構築。
- `algorithm/RecipeGraph.java`：隣接リスト、BFS、Parentからの経路復元。
- `api/CocktailController.java`：`GET /api/path` の入口。
- `static/graph-state.js`：traceの先頭から指定ステップまでを読み、画面用のQueue・Visited・Parentを再構築。
- `static/app.js`：ステップ操作とグラフ描画。探索本体とは分離している。

`RecipeGraph.Visit`には「取り出した頂点」「その処理後のQueue」「新しく発見した頂点」が入ります。画面のCurrentは、そのステップで取り出して処理した頂点です。Step 0ではまだ取り出していないため「—」です。

## 試す経路

- **Margarita → Negroni**：複数の段階を経て、8辺の最短経路を見られる。
- **Dry Martini → Negroni**：共通材料2つというルールでは経路が存在しない。
- **Dry Martini → Dry Martini**：経路は開始頂点1つ、辺数は0。

BFSが最小にするのは「辺の数」です。材料の購入数・価格・好みの差ではありません。

## 計算量

BFS本体は O(V+E) 時間、O(V) 追加メモリ。学習用traceではQueue全体を毎回コピーするため、最悪O(V²+E)時間・O(V²)追加メモリになります。24頂点だから扱える設計で、大規模グラフではtraceの制限が必要です。

## 説明できるようにする

- QueueをStackに変えると、なぜ同じ最短距離を保証できなくなる？
- Visitedをenqueue時に登録する理由は？
- 目的地が見つかった時点でQueueに他の頂点が残っていてもよい？
- Parentを後から上書きすると何が起こる？
- 辺に重みがあればBFSをそのまま使える？
- traceを保存するためのコストは、BFS本体のコストとどう違う？

自分の改修として、辺の共通材料数を切り替える機能や、traceを保存しないモードを追加すると学びを説明しやすくなります。理解して変更した部分とAIが支援した部分は、面接でも分けて説明してください。

## 検証

`mvn verify`、`node scripts/check-demo.mjs`、`node scripts/check-playback.mjs`。

BFSは全576組をFloyd–Warshallの距離と比較。再生は全traceの各ステップについてQueue順序、Visited、Parent、巻き戻しを確認します。以前のTrie・集合照合・ヒープ課題はAPIとテストに残っていますが、画面はGraph / BFSだけです。
