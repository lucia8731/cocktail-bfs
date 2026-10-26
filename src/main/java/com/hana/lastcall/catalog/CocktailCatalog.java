package com.hana.lastcall.catalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hana.lastcall.model.Cocktail;
import com.hana.lastcall.algorithm.Trie;
import com.hana.lastcall.algorithm.RecipeGraph;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.*;

@Component
public class CocktailCatalog {
    private final List<Cocktail> recipes;
    private final Map<String, Cocktail> byId = new LinkedHashMap<>();
    private final Map<String, Set<String>> ingredientIndex = new TreeMap<>();
    private final Trie names = new Trie();
    private final Trie ingredients = new Trie();
    private final RecipeGraph graph;

    public CocktailCatalog(ObjectMapper mapper) throws IOException {
        try (var stream = new ClassPathResource("cocktails.json").getInputStream()) {
            recipes = List.copyOf(mapper.readValue(stream, new TypeReference<List<Cocktail>>() {}));
        }
        for (Cocktail recipe : recipes) {
            if (byId.put(recipe.id(), recipe) != null) throw new IllegalStateException("Duplicate recipe ID");
            names.insert(recipe.name());
            for (String ingredient : recipe.ingredients()) {
                ingredientIndex.computeIfAbsent(ingredient, ignored -> new LinkedHashSet<>()).add(recipe.id());
            }
        }
        ingredientIndex.keySet().forEach(ingredients::insert);
        ingredientIndex.replaceAll((name, ids) -> Collections.unmodifiableSet(ids));
        graph = new RecipeGraph(recipes);
    }
    public List<Cocktail> all() { return recipes; }
    public Cocktail get(String id) { return byId.get(id); }
    public Set<String> ingredientNames() { return Collections.unmodifiableSet(ingredientIndex.keySet()); }
    public Set<String> recipesUsing(String ingredient) { return ingredientIndex.getOrDefault(ingredient, Set.of()); }
    public Trie names() { return names; }
    public Trie ingredients() { return ingredients; }
    public RecipeGraph graph() { return graph; }
}
