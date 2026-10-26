package com.hana.lastcall.service;

import com.hana.lastcall.catalog.CocktailCatalog;
import com.hana.lastcall.model.Cocktail;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class DiscoveryService {
    public record Match(Cocktail cocktail, List<String> matched, List<String> missing, double coverage) {}
    public record Metrics(int candidates, int catalogSize, int ingredientChecks, int heapOffers,
                          int heapEvictions, int maxHeapSize, int k, List<String> indexHits) {}
    public record Result(List<Match> results, Metrics metrics) {}
    private final CocktailCatalog catalog;
    public DiscoveryService(CocktailCatalog catalog) { this.catalog = catalog; }

    // Best first, with deterministic tie-breaking independent of HashSet iteration order.
    public static final Comparator<Match> BEST_FIRST = Comparator
            .comparingDouble(Match::coverage).reversed()
            .thenComparingInt(m -> m.missing().size())
            .thenComparing(m -> m.cocktail().name());

    public Result discover(Collection<String> supplied, String query, String base, String tag,
                           boolean readyOnly, int k) {
        if (k < 1 || k > 24) throw new IllegalArgumentException("k must be between 1 and 24");
        Set<String> pantry = new HashSet<>();
        for (String value : supplied) {
            String ingredient = value.trim().toLowerCase(Locale.ROOT);
            if (!catalog.ingredientNames().contains(ingredient)) throw new IllegalArgumentException("Unknown ingredient: " + ingredient);
            pantry.add(ingredient);
        }
        Set<String> candidates = new LinkedHashSet<>();
        if (pantry.isEmpty()) catalog.all().forEach(r -> candidates.add(r.id()));
        else pantry.stream().sorted().forEach(ingredient -> candidates.addAll(catalog.recipesUsing(ingredient)));
        String normalizedQuery = query.trim().toLowerCase(Locale.ROOT);
        // Reverse comparator keeps the WORST retained result at the root of the min-heap.
        PriorityQueue<Match> topK = new PriorityQueue<>(BEST_FIRST.reversed());
        int checks = 0, offers = 0, evictions = 0, maxSize = 0;
        for (String id : candidates) {
            Cocktail recipe = catalog.get(id);
            if (!recipe.name().toLowerCase(Locale.ROOT).contains(normalizedQuery)) continue;
            if (!base.equals("all") && !recipe.base().equals(base)) continue;
            if (!tag.equals("all") && !recipe.tags().contains(tag)) continue;
            List<String> matched = new ArrayList<>(), missing = new ArrayList<>();
            for (String ingredient : recipe.ingredients()) {
                checks++;
                if (pantry.contains(ingredient)) matched.add(ingredient); else missing.add(ingredient);
            }
            if (readyOnly && !missing.isEmpty()) continue;
            Match match = new Match(recipe, List.copyOf(matched), List.copyOf(missing),
                    (double) matched.size() / recipe.ingredients().size());
            offers++;
            if (topK.size() < k) topK.offer(match);
            else if (BEST_FIRST.compare(match, topK.peek()) < 0) {
                topK.poll(); topK.offer(match); evictions++;
            }
            maxSize = Math.max(maxSize, topK.size());
        }
        List<Match> sorted = new ArrayList<>(topK); sorted.sort(BEST_FIRST);
        return new Result(List.copyOf(sorted), new Metrics(candidates.size(), catalog.all().size(),
                checks, offers, evictions, maxSize, k, pantry.stream().sorted().toList()));
    }
}
