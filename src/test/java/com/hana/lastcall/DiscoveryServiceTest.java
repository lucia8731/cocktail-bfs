package com.hana.lastcall;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hana.lastcall.catalog.CocktailCatalog;
import com.hana.lastcall.service.DiscoveryService;
import com.hana.lastcall.service.DiscoveryService.Match;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class DiscoveryServiceTest {
    CocktailCatalog catalog;
    DiscoveryService service;
    @BeforeEach void setup() throws Exception {
        catalog = new CocktailCatalog(new ObjectMapper()); service = new DiscoveryService(catalog);
    }
    @Test void completeShelfRanksReadyRecipesFirst() {
        var result = service.discover(List.of("gin", "lime juice", "simple syrup"), "", "all", "all", false, 6);
        assertThat(result.results().get(0).cocktail().id()).isEqualTo("gimlet");
        assertThat(result.results().get(0).coverage()).isEqualTo(1.0);
        assertThat(result.results().get(0).missing()).isEmpty();
        assertThat(result.metrics().maxHeapSize()).isLessThanOrEqualTo(6);
    }
    @Test void duplicateIngredientsDoNotChangeCoverage() {
        var a = service.discover(List.of(" GIN ", "gin", "lime juice"), "", "all", "all", false, 6);
        var b = service.discover(List.of("gin", "lime juice"), "", "all", "all", false, 6);
        assertThat(a).isEqualTo(b);
    }
    @Test void emptyShelfBrowsesEntireCatalogWithZeroCoverage() {
        var result = service.discover(List.of(), "", "all", "all", false, 24);
        assertThat(result.results()).hasSize(24).allSatisfy(m -> assertThat(m.coverage()).isZero());
        assertThat(result.metrics().candidates()).isEqualTo(24);
    }
    @Test void combinedFiltersAndReadyOnlyAreRespected() {
        var result = service.discover(List.of("gin", "lemon juice", "simple syrup", "soda water"), "COLL", "gin", "refreshing", true, 6);
        assertThat(result.results()).extracting(m -> m.cocktail().id()).containsExactly("tom-collins");
    }
    @Test void impossibleFilterAndEmptyReadyShelfAreEmpty() {
        assertThat(service.discover(List.of("gin"), "", "rum", "all", false, 6).results()).isEmpty();
        assertThat(service.discover(List.of(), "", "all", "all", true, 6).results()).isEmpty();
    }
    @Test void invalidInputIsRejected() {
        assertThatThrownBy(() -> service.discover(List.of("unknown"), "", "all", "all", false, 6)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.discover(List.of(), "", "all", "all", false, 0)).isInstanceOf(IllegalArgumentException.class);
    }
    @ParameterizedTest @ValueSource(ints = {1, 3, 6, 12, 24})
    void boundedHeapMatchesIndependentFullSortOracle(int k) {
        Random random = new Random(4721);
        List<String> ingredients = new ArrayList<>(catalog.ingredientNames());
        for (int sample = 0; sample < 80; sample++) {
            Set<String> pantry = new HashSet<>();
            for (String i : ingredients) if (random.nextDouble() < 0.25) pantry.add(i);
            List<Match> expected = new ArrayList<>();
            for (var r : catalog.all()) {
                List<String> matched = r.ingredients().stream().filter(pantry::contains).toList();
                if (!pantry.isEmpty() && matched.isEmpty()) continue;
                List<String> missing = r.ingredients().stream().filter(i -> !pantry.contains(i)).toList();
                expected.add(new Match(r, matched, missing, (double) matched.size() / r.ingredients().size()));
            }
            // Independent comparator: all recipes sorted, without an index or heap.
            expected.sort((a, b) -> {
                int score = Double.compare(b.coverage(), a.coverage());
                if (score != 0) return score;
                int missing = Integer.compare(a.missing().size(), b.missing().size());
                return missing != 0 ? missing : a.cocktail().name().compareTo(b.cocktail().name());
            });
            var result = service.discover(pantry, "", "all", "all", false, k);
            assertThat(result.results()).isEqualTo(expected.stream().limit(k).toList());
            assertThat(result.metrics().maxHeapSize()).isLessThanOrEqualTo(k);
        }
    }
}
