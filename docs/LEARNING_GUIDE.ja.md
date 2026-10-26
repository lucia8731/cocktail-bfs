# Last Call の読み方・学習ガイド

このアプリは、カクテルを題材にデータ構造を実際の機能へ結びつけるポートフォリオです。AI支援で作成されています。面接で説明する際は、自分でコードを読み、動作を確認し、変更した部分と理解した内容を自分の言葉で話してください。

## 最初の5ステップ

1. `mvn spring-boot:run` で起動し、`http://localhost:8080` を開く。左下が **Java API connected** になっていることを確認する。
2. House bar を選ぶ。Gimlet・Gin Sour・Tom Collins が作れる理由を、材料リストと照らし合わせる。
3. `DiscoveryService.java` を読む。`pantry` → `candidates` → 材料の照合 → `topK` → 表示用ソートの順に追う。
4. `Trie.java` を読む。Under the hood で `ma` と `xyz` を入力し、存在する枝と存在しない枝の違いを見る。
5. `RecipeGraph.java` を読む。Recipe graph で経路を実行し、紙に queue / visited / parent を書いて最初の3回を再現する。

## 1. HashSet：棚の材料を重複させない

`gin` を2回持っていると入力しても、材料の種類は1種類です。HashSetなら重複がなくなり、`pantry.contains("gin")` で材料を持っているかを平均 O(1) で確認できます。

配列やArrayListの `contains` は最悪 O(P) です。ただし、今回のような小さな棚では速度差を測定したわけではありません。「絶対に高速」とは言わず、構造の特性と選択理由を説明しましょう。

**確認:** `DiscoveryServiceTest.duplicateIngredientsDoNotChangeCoverage`。

## 2. 逆引きインデックス：材料 → レシピ

普通のレシピは「Gimlet → gin / lime juice / simple syrup」です。逆引きは「gin → Gimlet / Gin Sour / Negroni …」という向きです。

棚の各材料が指すレシピIDの **和集合（union）** を候補にします。「全部の材料を持っている必要がある」共通部分（intersection）ではありません。候補を絞ったあとに不足材料を調べます。

**注意:** 空の棚は例外として全レシピを表示します。空でない棚では、材料を1つも共有しないレシピは候補に入りません。

**読んでみる:** `CocktailCatalog.recipesUsing()` と `DiscoveryService.discover()` の `candidates`。

## 3. PriorityQueue：上位K件だけ保持

Gimletの材料を3つすべて持っていればcoverageは `3 / 3 = 100%`。Mojitoの5つ中3つなら `3 / 5 = 60%` です。

ランキング順は次の通りです。

1. coverageが高い。
2. 同点なら不足材料が少ない。
3. さらに同点なら名前順。

全候補をソートする代わりに、K件だけヒープに残します。ここで重要なのは **根が「残っている中で一番悪い結果」** になっていること。新しい候補が根より良ければ、根と入れ替えます。

Javaの `PriorityQueue` は最小要素を根にします。この実装は `BEST_FIRST.reversed()` を使い、最良順の比較を逆転しています。

**手で追う:** K=2として、80%、50%、90%、40%の順に候補が来たらどうなる？ 最終結果は90%と80%。根は80%。

**確認:** テストでは、ヒープを使わず全件ソートした結果と400ケース比較しています。

## 4. Trie：文字を1つずつたどる

`ma` を入力したら、root → m → a と進み、その下の枝だけを調べます。今のカタログならManhattanとMargaritaが見つかります。Dry Martiniは `dry` から始まるため `ma` の候補にはなりません。

`prefixSteps` は接頭辞をたどろうとした文字数。`nodesVisited` は候補の部分木で訪問したノード数です。レシピ件数や実行時間そのものではありません。

子ノードはTreeMapで管理しているので、候補が辞書順になります。HashMapに変えると探索順が保証されなくなる点も説明できるとよいです。

## 5. Graph + BFS：最短のつながり

レシピが頂点（vertex）、材料を2つ以上共有する関係が辺（edge）です。これは無向・重みなしグラフです。

- `adjacency`：各レシピの隣のレシピ一覧。
- `queue`：次に調べる頂点。先入れ先出し（FIFO）。
- `visited`：すでに発見した頂点。enqueueの時点で登録する。
- `parent`：どの頂点から来たか。最後に経路を復元するために使う。

BFSは1歩先、2歩先…の順に調べるので、重みなしのグラフでは最短の辺数を求められます。材料の購入数や値段を最小にしているわけではありません。

**やってみる:** Margarita → Negroni、Dry Martini → Negroni、同じレシピ → 同じレシピを比べる。

**計算量の注意:** BFSの本体は O(V+E)。学習用に各ステップのqueue全体をコピーするため、このアプリのtrace込みでは最悪 O(V²+E) 時間・O(V²)追加メモリが必要です。

## Java / Spring Boot の役割

| ファイル | 責任 |
|---|---|
| `LastCallApplication.java` | Spring Bootの起動 |
| `CocktailController.java` | HTTPリクエストを受け取り、入力を検証してサービスへ渡す |
| `ApiErrors.java` | 不正な入力をHTTP 400として返す |
| `CocktailCatalog.java` | JSONを読み込み、検索用の構造を起動時に用意する |
| `DiscoveryService.java` | 検索・スコア計算・ヒープによる上位K件の選択 |
| `Trie.java` / `RecipeGraph.java` | Springに依存しないデータ構造・アルゴリズム |
| `model/Cocktail.java` | 書き換えられないレシピデータを表すrecord |

`@RestController` はAPIの入り口、`@Service` は処理、`@Component` はSpringが管理する部品です。コンストラクターで必要な部品を受け取るのが依存性注入です。アルゴリズム自身はHTTPを知らないので、単体テストしやすくなっています。

## 面接前に答えられるようにしたいこと

- なぜ材料の候補抽出はintersectionではなくunion？
- なぜヒープの根を最良ではなく最悪にする？
- なぜBFSでvisitedをenqueue時に更新する？
- 辺に重みを付けたら、なぜBFSだけでは不十分？
- データが24件なら線形走査でもよいのに、なぜこれらの構造を使った？
- Java本体と公開デモは何が違い、どうやって一致を検証した？
- 何を自分で実装・変更・検証し、どこにAIの支援を使った？

## 自分の作品にするための小さな改修

1. 好きなカクテルをJSONに追加し、グラフや検索結果の変化を確認する。
2. ランキングの第2条件を変え、テストの期待値がどう変わるか説明する。
3. 「あと1材料で完成」のフィルターを、Java側から追加する。
4. BFSのtraceを表示しないモードを追加し、メモリの違いを説明する。
5. リクエストから結果表示までを、自分で簡単な図に描いて説明する。

変更後は `mvn verify` と `node scripts/check-demo.mjs`。Java側の仕様を変えた場合、デモも同じ仕様に更新する必要があります。
