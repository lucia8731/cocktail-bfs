package com.hana.cocktailbfs;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiIntegrationTest {
    @Autowired TestRestTemplate http;
    @Test void servesUIAndCatalogFromTheSameOrigin() {
        assertThat(http.getForEntity("/", String.class).getBody()).contains("Cocktail BFS", "runtime-config.js");
        assertThat(http.getForEntity("/runtime-config.js", String.class).getBody()).contains("'api'");
        var result = http.getForEntity("/api/catalog", Map.class);
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<?>)result.getBody().get("cocktails")).hasSize(24);
    }
    @Test void liveSearchReturnsActualJavaMetrics() {
        var result = http.postForEntity("/api/discover", Map.of("pantry", List.of("gin", "lime juice", "simple syrup"), "query", "", "base", "all", "tag", "all", "readyOnly", true, "k", 6), Map.class);
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<?>) result.getBody().get("results")).hasSize(1);
        assertThat(result.getBody()).containsKey("metrics");
    }
    @ParameterizedTest @ValueSource(strings = {
        "{\"pantry\":[],\"query\":\"\",\"base\":\"all\",\"tag\":\"all\",\"k\":0}",
        "{\"pantry\":[\"unknown\"],\"query\":\"\",\"base\":\"all\",\"tag\":\"all\",\"k\":6}",
        "{\"pantry\":null,\"query\":\"\",\"base\":\"all\",\"tag\":\"all\",\"k\":6}",
        "{\"pantry\":[],\"query\":\"\",\"base\":\"invalid\",\"tag\":\"all\",\"k\":6}"
    })
    void invalidRequestsReturnProblemDetails(String json) {
        HttpHeaders headers = new HttpHeaders(); headers.setContentType(MediaType.APPLICATION_JSON);
        var result = http.postForEntity("/api/discover", new HttpEntity<>(json, headers), Map.class);
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(result.getBody()).containsKey("detail");
    }
    @Test void handlesMissingRecipeAndUnknownPath() {
        assertThat(http.getForEntity("/api/cocktails/absent", String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(http.getForEntity("/api/path?from=absent&to=negroni", String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
    @Test void autocompleteAndPathAreExposed() {
        assertThat(http.getForEntity("/api/suggest?prefix=ma", String.class).getBody()).contains("Margarita", "Manhattan");
        assertThat(http.getForEntity("/api/path?from=martini&to=martini", String.class).getBody()).contains("martini", "edgesExamined");
    }
}
