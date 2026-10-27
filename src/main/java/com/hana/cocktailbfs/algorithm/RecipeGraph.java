package com.hana.cocktailbfs.algorithm;
import com.hana.cocktailbfs.model.Cocktail;
import java.util.*;
/** Undirected, unweighted graph; an edge means at least two shared core ingredients. */
public final class RecipeGraph {
    public record Edge(String source, String target, List<String> shared) {}
    public record Visit(String current, List<String> queue, List<String> discovered) {}
    public record PathResult(List<String> path, List<Visit> trace, int visited, int edgesExamined) {}
    private final Map<String, List<String>> adjacency = new LinkedHashMap<>();
    private final List<Edge> edges = new ArrayList<>();
    public RecipeGraph(List<Cocktail> recipes) {
        recipes.forEach(r -> adjacency.put(r.id(), new ArrayList<>()));
        for (int i = 0; i < recipes.size(); i++) for (int j = i + 1; j < recipes.size(); j++) {
            Cocktail a = recipes.get(i), b = recipes.get(j);
            Set<String> common = new LinkedHashSet<>(a.ingredients()); common.retainAll(new HashSet<>(b.ingredients()));
            if (common.size() >= 2) {
                adjacency.get(a.id()).add(b.id()); adjacency.get(b.id()).add(a.id());
                edges.add(new Edge(a.id(), b.id(), List.copyOf(common)));
            }
        }
        adjacency.replaceAll((id, neighbors) -> List.copyOf(neighbors));
    }
    public List<Edge> edges() { return List.copyOf(edges); }
    public PathResult shortestPath(String start, String end) {
        if (!adjacency.containsKey(start) || !adjacency.containsKey(end)) throw new IllegalArgumentException("Unknown cocktail ID");
        Deque<String> queue = new ArrayDeque<>(); Set<String> visited = new LinkedHashSet<>();
        Map<String, String> parent = new HashMap<>(); List<Visit> trace = new ArrayList<>();
        queue.add(start); visited.add(start); // Mark at enqueue, preventing repeated work in cycles.
        int examined = 0;
        while (!queue.isEmpty()) {
            String current = queue.removeFirst(); List<String> discovered = new ArrayList<>();
            if (!current.equals(end)) for (String neighbor : adjacency.get(current)) {
                examined++;
                if (visited.add(neighbor)) {
                    parent.put(neighbor, current); queue.addLast(neighbor); discovered.add(neighbor);
                }
            }
            trace.add(new Visit(current, List.copyOf(queue), List.copyOf(discovered)));
            if (current.equals(end)) {
                LinkedList<String> path = new LinkedList<>();
                for (String at = end; at != null; at = parent.get(at)) path.addFirst(at);
                return new PathResult(List.copyOf(path), List.copyOf(trace), visited.size(), examined);
            }
        }
        return new PathResult(List.of(), List.copyOf(trace), visited.size(), examined);
    }
}
