package com.hana.cocktailbfs;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hana.cocktailbfs.catalog.CocktailCatalog;
import com.hana.cocktailbfs.algorithm.RecipeGraph;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class RecipeGraphTest {
    CocktailCatalog catalog;
    RecipeGraph graph;
    @BeforeEach void setup() throws Exception { catalog = new CocktailCatalog(new ObjectMapper()); graph = catalog.graph(); }
    @Test void edgeRuleHasNoSelfLoopsOrDuplicateEdges() {
        Set<String> seen = new HashSet<>();
        for (var edge : graph.edges()) {
            assertThat(edge.source()).isNotEqualTo(edge.target());
            assertThat(seen.add(edge.source() + ":" + edge.target())).isTrue();
            Set<String> actual = new HashSet<>(catalog.get(edge.source()).ingredients());
            actual.retainAll(catalog.get(edge.target()).ingredients());
            assertThat(actual).hasSizeGreaterThanOrEqualTo(2).containsExactlyInAnyOrderElementsOf(edge.shared());
        }
    }
    @Test void sameNodeIsZeroHops() {
        var result = graph.shortestPath("martini", "martini");
        assertThat(result.path()).containsExactly("martini"); assertThat(result.edgesExamined()).isZero();
    }
    @Test void isolatedNodeHasNoPath() {
        assertThat(graph.shortestPath("martini", "negroni").path()).isEmpty();
    }
    @Test void unknownNodeIsRejected() {
        assertThatThrownBy(() -> graph.shortestPath("not-a-drink", "negroni")).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void traceEnqueuesEachNodeOnlyOnceEvenWithCycles() {
        var result = graph.shortestPath("margarita", "negroni");
        Set<String> discovered = new HashSet<>(); discovered.add("margarita");
        for (var visit : result.trace()) for (String id : visit.discovered()) assertThat(discovered.add(id)).isTrue();
        assertThat(result.visited()).isEqualTo(discovered.size());
    }
    @Test void allPairsAgreeWithFloydWarshallShortestDistanceOracle() {
        List<String> ids = catalog.all().stream().map(r -> r.id()).toList();
        int n = ids.size(); int[][] distance = new int[n][n];
        for (int i = 0; i < n; i++) { Arrays.fill(distance[i], 10000); distance[i][i] = 0; }
        for (var edge : graph.edges()) {
            int i = ids.indexOf(edge.source()), j = ids.indexOf(edge.target()); distance[i][j] = distance[j][i] = 1;
        }
        for (int k = 0; k < n; k++) for (int i = 0; i < n; i++) for (int j = 0; j < n; j++)
            distance[i][j] = Math.min(distance[i][j], distance[i][k] + distance[k][j]);
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) {
            var path = graph.shortestPath(ids.get(i), ids.get(j)).path();
            if (distance[i][j] == 10000) assertThat(path).isEmpty();
            else {
                assertThat(path).hasSize(distance[i][j] + 1).startsWith(ids.get(i)).endsWith(ids.get(j));
                for (int k = 1; k < path.size(); k++) assertThat(distance[ids.indexOf(path.get(k - 1))][ids.indexOf(path.get(k))]).isEqualTo(1);
            }
        }
    }
}
