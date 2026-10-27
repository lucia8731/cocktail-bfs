package com.hana.cocktailbfs.api;

import com.hana.cocktailbfs.catalog.CocktailCatalog;
import com.hana.cocktailbfs.service.DiscoveryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api")
@Validated
public class CocktailController {
    private final CocktailCatalog catalog;
    private final DiscoveryService discovery;
    public CocktailController(CocktailCatalog catalog, DiscoveryService discovery) {
        this.catalog = catalog; this.discovery = discovery;
    }
    @GetMapping("/health") public Map<String, String> health() {
        return Map.of("status", "UP", "engine", "Java 17 · Spring Boot");
    }
    @GetMapping("/catalog") public Object catalog() {
        return Map.of("cocktails", catalog.all(), "ingredients", catalog.ingredientNames(), "edges", catalog.graph().edges());
    }
    @GetMapping("/cocktails/{id}") public Object cocktail(@PathVariable String id) {
        var recipe = catalog.get(id);
        if (recipe == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cocktail not found");
        return recipe;
    }
    @GetMapping("/suggest") public Object suggest(
            @RequestParam(defaultValue = "") @Size(max = 80) String prefix,
            @RequestParam(defaultValue = "cocktails") String type) {
        if (!Set.of("cocktails", "ingredients").contains(type)) throw new IllegalArgumentException("Unknown suggestion type");
        return (type.equals("ingredients") ? catalog.ingredients() : catalog.names()).suggest(prefix, 8);
    }
    public record DiscoverRequest(@NotNull @Size(max = 40) List<@NotBlank @Size(max = 80) String> pantry,
                                  @NotNull @Size(max = 80) String query,
                                  @NotNull @Pattern(regexp = "all|gin|rum|tequila|mezcal|whiskey|vodka|brandy|zero-proof") String base,
                                  @NotNull @Pattern(regexp = "all|citrusy|bright|sweet|refreshing|herbal|smoky|bitter|bold|dry|spicy") String tag,
                                  boolean readyOnly, @Min(1) @Max(24) int k) {}
    @PostMapping("/discover") public Object discover(@Valid @RequestBody DiscoverRequest request) {
        return discovery.discover(request.pantry(), request.query(), request.base(), request.tag(), request.readyOnly(), request.k());
    }
    @GetMapping("/path") public Object path(@RequestParam String from, @RequestParam String to) {
        return catalog.graph().shortestPath(from, to);
    }
}
