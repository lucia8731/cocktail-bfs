# Deployment

## Published interactive demo

https://last-call-algorithm-lab.livelyearth32768.chatgpt.site

This is the static browser runtime. It is deliberately labeled as such and needs no server, API key, or database. It is suitable for a recruiter to explore immediately.

To export the demo locally:

```bash
python3 scripts/build-demo.py
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. Export changes `runtime-config.js` to `demo`, copies the shared recipe catalog, and includes a downloadable source snapshot. This does not alter the Spring Boot runtime configuration.

## JVM application

The repository includes an executable Spring Boot jar build and a multi-stage Dockerfile. The Java runtime is verified through HTTP integration tests. The published static demo is **not** evidence of a hosted JVM service.

For a container host:

1. Build `docker build -t last-call .`.
2. Run `docker run --rm -p 8080:8080 last-call`.
3. Check `/api/health` and the **Java API connected** badge.

`render.yaml` is an optional blueprint for a compatible Docker host. No service is provisioned by including it, and no hosting purchase has been made. Deploying requires the owner’s hosting account; check the provider’s current plan availability and conditions before creating a service. A sleeping free-tier server can have a cold start. No particular price or availability is promised here.

The Docker build runs Java tests. Docker itself has not been executed in the authoring environment; Maven-built jar packaging and HTTP integration were tested directly.

## Optional GitHub Pages

`.github/workflows/pages.yml` exports and publishes the static demo on pushes to `main`. Configure the repository’s Pages source as **GitHub Actions** before using it. It serves the browser runtime only; GitHub Pages does not execute the Spring Boot server. The independent `ci.yml` workflow verifies Java and browser parity and uploads build artifacts.
