package com.hana.lastcall.model;
import java.util.List;
/** Immutable entry. Ingredients are core ingredients; garnish and ice are omitted. */
public record Cocktail(String id, String name, String base, String family, String color,
                       String glass, String description, List<String> ingredients,
                       List<String> measures, List<String> steps, List<String> tags) {
    public Cocktail {
        ingredients = List.copyOf(ingredients); measures = List.copyOf(measures);
        steps = List.copyOf(steps); tags = List.copyOf(tags);
        if (ingredients.size() != measures.size()) throw new IllegalArgumentException("Every ingredient needs a measure");
    }
}
