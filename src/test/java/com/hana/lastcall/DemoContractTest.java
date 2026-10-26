package com.hana.lastcall;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hana.lastcall.catalog.CocktailCatalog;
import com.hana.lastcall.service.DiscoveryService;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

/** Exports real Java responses. Node checks the public demo against this contract. */
class DemoContractTest {
    @Test void exportJavaResultsForBrowserParity() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        CocktailCatalog catalog = new CocktailCatalog(mapper);
        DiscoveryService service = new DiscoveryService(catalog);
        List<Object> searches = new ArrayList<>(), paths = new ArrayList<>(), prefixes = new ArrayList<>();
        Random random = new Random(8731);
        String[] bases = {"all", "gin", "tequila", "rum", "zero-proof"};
        String[] tags = {"all", "citrusy", "sweet", "bold"};
        int[] limits = {1, 3, 6, 12, 24};
        for (int n = 0; n < 120; n++) {
            List<String> pantry = catalog.ingredientNames().stream().filter(i -> random.nextDouble() < 0.25).toList();
            String base = bases[n % bases.length], tag = tags[n % tags.length];
            String query = n % 9 == 0 ? "sour" : "";
            boolean ready = n % 7 == 0; int k = limits[n % limits.length];
            var options = Map.of("pantry", pantry, "base", base, "tag", tag, "query", query, "readyOnly", ready, "k", k);
            searches.add(Map.of("options", options, "expected", service.discover(pantry, query, base, tag, ready, k)));
        }
        for (var a : catalog.all()) for (var b : catalog.all())
            paths.add(Map.of("from", a.id(), "to", b.id(), "expected", catalog.graph().shortestPath(a.id(), b.id())));
        for (String type : List.of("ingredients", "cocktails")) for (String prefix : List.of("", "ma", "  GIN ", "s", "xyz", "lime", "Bee"))
            prefixes.add(Map.of("type", type, "prefix", prefix, "expected", (type.equals("ingredients") ? catalog.ingredients() : catalog.names()).suggest(prefix, 8)));
        Path output = Path.of("target/demo-contract.json");
        Files.createDirectories(output.getParent());
        mapper.writeValue(output.toFile(), Map.of("searches", searches, "paths", paths, "prefixes", prefixes));
        assertThat(Files.size(output)).isGreaterThan(1000);
    }
}
