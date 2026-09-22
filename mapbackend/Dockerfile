# =============================================================================
#  API do Smart Park em contêiner.
#
#  Serve para publicar a API em qualquer serviço que aceite Docker (Railway,
#  Render, Fly.io, Google Cloud Run). O Vercel não roda Java, então o backend
#  precisa de outro endereço — o front aponta para ele pela VITE_API_URL.
#
#  Build local:  docker build -t smartpark-api .
#  Rodar local:  docker run -p 8080:8080 -e SPRING_PROFILES_ACTIVE=dev smartpark-api
# =============================================================================

# ---- Etapa 1: compila e empacota -------------------------------------------
# O JDK completo só é necessário para compilar; ele não vai para a imagem final.
FROM maven:3.9-eclipse-temurin-17 AS construcao
WORKDIR /app

# As dependências são baixadas em uma camada separada: enquanto o pom.xml não
# mudar, o Docker reaproveita o cache e o build seguinte não baixa tudo de novo.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests package

# ---- Etapa 2: imagem final --------------------------------------------------
# Só o runtime Java, o que deixa a imagem bem menor que a de compilação.
FROM eclipse-temurin:17-jre
WORKDIR /app

# Rodar como root desnecessariamente é risco: se alguém escapar da aplicação,
# já estaria com o usuário mais poderoso do contêiner.
RUN useradd --system --create-home --shell /usr/sbin/nologin smartpark
USER smartpark

COPY --from=construcao /app/target/mapbackend-*.jar app.jar

EXPOSE 8080

# Variáveis que o serviço de hospedagem deve definir:
#   SPRING_PROFILES_ACTIVE=prod
#   SPRING_DATASOURCE_URL / MYSQL_USER / MYSQL_PASSWORD
#   SMARTPARK_JWT_SECRET      (obrigatória em prod: sem ela a aplicação não sobe)
#   SMARTPARK_CORS_ORIGENS    (domínio do front publicado)
# A JVM, sozinha, dimensiona a memoria pelo total da maquina, e nao pelo limite
# do contentor. Em uma instancia de 512 MB (o plano gratuito da Render, por
# exemplo) ela pediria mais do que existe e o servico morreria por falta de
# memoria. MaxRAMPercentage a mantem dentro do que foi realmente concedido.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
