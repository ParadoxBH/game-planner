# ---------- build ----------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# Camada de dependências separada: só refaz o download quando o pom muda.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -ntp -DskipTests package

# ---------- runtime ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

# ffmpeg/ffprobe são requisito do subsistema de mídia (doc/backend_plan.md 4.7):
# toda imagem enviada é reconvertida para WebP antes de ser armazenada.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg curl \
 && rm -rf /var/lib/apt/lists/*

# Não roda como root: uploads são entrada de arquivo hostil.
RUN useradd --system --uid 10001 --create-home app
USER app

COPY --from=build --chown=app:app /build/target/*.jar app.jar

# Volume do acervo de mídia. Em produção é bind mount ou volume nomeado.
VOLUME ["/var/lib/gameplanner/media"]
ENV MEDIA_STORAGE_PATH=/var/lib/gameplanner/media

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
