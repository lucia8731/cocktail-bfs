package com.hana.cocktailbfs;
import com.hana.cocktailbfs.algorithm.Trie;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import java.util.List;

class TrieTest {
    private Trie trie() {
        Trie trie = new Trie();
        List.of("Margarita", "Manhattan", "Martini", "Mojito", "Gin Sour").forEach(trie::insert);
        return trie;
    }
    @Test void normalizesCaseAndWhitespace() {
        assertThat(trie().suggest(" MA ", 8).words()).containsExactly("Manhattan", "Margarita", "Martini");
    }
    @Test void reportsOnlyPrefixAndMatchingSubtreeWork() {
        var result = trie().suggest("moj", 8);
        assertThat(result.words()).containsExactly("Mojito");
        assertThat(result.prefixSteps()).isEqualTo(3);
        assertThat(result.nodesVisited()).isEqualTo(4);
    }
    @Test void absentBranchReturnsEmptyWithoutSubtreeTraversal() {
        var result = trie().suggest("xyz", 8);
        assertThat(result.words()).isEmpty();
        assertThat(result.prefixSteps()).isEqualTo(1);
        assertThat(result.nodesVisited()).isZero();
    }
    @Test void limitAndEmptyPrefixAreDeterministic() {
        assertThat(trie().suggest("", 2).words()).containsExactly("Gin Sour", "Manhattan");
        assertThat(trie().suggest("ma", 1).words()).containsExactly("Manhattan");
        assertThat(trie().suggest("ma", 0).words()).isEmpty();
    }
    @Test void duplicateInsertionDoesNotDuplicateResults() {
        Trie trie = trie(); trie.insert("Mojito");
        assertThat(trie.suggest("mo", 8).words()).containsExactly("Mojito");
    }
}
