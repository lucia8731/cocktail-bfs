FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn --batch-mode --no-transfer-progress dependency:go-offline
COPY src src
RUN mvn --batch-mode --no-transfer-progress verify

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S cocktailbfs && adduser -S cocktailbfs -G cocktailbfs
WORKDIR /app
COPY --from=build /app/target/cocktail-bfs-1.0.0.jar app.jar
USER cocktailbfs
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "app.jar"]
