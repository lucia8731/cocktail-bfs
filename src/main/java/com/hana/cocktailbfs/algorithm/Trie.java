package com.hana.cocktailbfs.algorithm;
import java.util.*;
/** Prefix tree built once at startup; reads are safe after construction. */
public final class Trie {
    private static final class Node {
        final Map<Character, Node> children = new TreeMap<>();
        String word;
    }
    private final Node root = new Node();
    public void insert(String word) {
        Node node = root;
        for (char letter : word.toLowerCase(Locale.ROOT).toCharArray())
            node = node.children.computeIfAbsent(letter, ignored -> new Node());
        node.word = word;
    }
    public record Suggestions(List<String> words, int prefixSteps, int nodesVisited) {}
    public Suggestions suggest(String prefix, int limit) {
        Node node = root; int steps = 0;
        for (char letter : prefix.trim().toLowerCase(Locale.ROOT).toCharArray()) {
            steps++; node = node.children.get(letter);
            if (node == null) return new Suggestions(List.of(), steps, 0);
        }
        List<String> words = new ArrayList<>(); int[] visited = {0};
        collect(node, words, limit, visited);
        return new Suggestions(List.copyOf(words), steps, visited[0]);
    }
    private void collect(Node node, List<String> result, int limit, int[] visited) {
        if (result.size() >= limit) return;
        visited[0]++;
        if (node.word != null) result.add(node.word);
        for (Node child : node.children.values()) {
            if (result.size() >= limit) break;
            collect(child, result, limit, visited);
        }
    }
}
