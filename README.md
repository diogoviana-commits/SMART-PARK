Detalhamento de Backend:

## Backend: Spring Boot + MySQL + Hibernate Spatial

### ✅ Pré-requisitos

- **Java JDK 17** (ou 11+)
- **MySQL Server** instalado e em execução
- **VSCode** com as extensões:
  - *Extension Pack for Java* (inclui Spring Boot Tools, Maven, etc.)
  - *MySQL* (opcional, para gerenciar o banco)
- **Postman** ou **Insomnia** para testar a API (opcional)

---

## 🔧 Passo a Passo no VSCode

### 1. Criar o Projeto Spring Boot

- Abra o VSCode.
- Pressione `Ctrl+Shift+P` para abrir a paleta de comandos.
- Digite e selecione: **Spring Initializr: Generate a Maven Project**.
- Escolha as opções:
  - **Language**: Java
  - **Group**: `com.example`
  - **Artifact**: `mapbackend`
  - **Dependencies**:
    - Spring Web
    - Spring Data JPA
    - MySQL Driver
- Clique em **Generate** e selecione a pasta onde o projeto será criado.
- Aguarde a geração e depois abra a pasta do projeto no VSCode.

---

### 2. Adicionar Dependências Manuais (Hibernate Spatial)

Abra o arquivo **`pom.xml`** e adicione as seguintes dependências dentro da tag `<dependencies>`:

```xml
<!-- Suporte a tipos espaciais (Geometry, Point) -->
<dependency>
    <groupId>org.hibernate</groupId>
    <artifactId>hibernate-spatial</artifactId>
    <version>5.6.15.Final</version>
</dependency>

<!-- Biblioteca JTS para manipulação de geometrias -->
<dependency>
    <groupId>org.locationtech.jts</groupId>
    <artifactId>jts-core</artifactId>
    <version>1.19.0</version>
</dependency>
```

Salve o arquivo. O VSCode pode pedir para sincronizar (clique em "Sync" ou no ícone de recarregar no canto inferior direito).

---

### 3. Configurar o Banco de Dados

Crie o banco de dados no MySQL (se ainda não existir):

```sql
CREATE DATABASE mapdb;
```

Agora configure a conexão no Spring Boot. Edite o arquivo **`src/main/resources/application.properties`** (ou crie um `application.yml`):

```properties
# Configuração do MySQL
spring.datasource.url=jdbc:mysql://localhost:3306/mapdb?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=sua_senha
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# Configuração do JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.spatial.dialect.mysql.MySQL56InnoDBSpatialDialect
spring.jpa.properties.hibernate.format_sql=true
```

Substitua `sua_senha` pela senha do seu MySQL.

---

### 4. Criar a Entidade (Model)

Crie um pacote `com.smartparkuscs.mapbackend.model` e dentro dele a classe **`Localizacao.java`**:

```java
package com.smartparkuscs.mapbackend.model;

import org.locationtech.jts.geom.Point;
import javax.persistence.*;

@Entity
@Table(name = "localizacoes")
public class Localizacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;

    @Column(columnDefinition = "GEOMETRY")
    private Point coordenadas;

    public Localizacao() {}

    public Localizacao(String nome, Point coordenadas) {
        this.nome = nome;
        this.coordenadas = coordenadas;
    }

    // Getters e Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Point getCoordenadas() {
        return coordenadas;
    }

    public void setCoordenadas(Point coordenadas) {
        this.coordenadas = coordenadas;
    }
}
```

---

### 5. Criar o Repositório

Pacote `com.smartparkuscs.mapbackend.repository`:

```java
package com.smartparkuscs.mapbackend.repository;

import com.smartparkuscs.mapbackend.model.Localizacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LocalizacaoRepository extends JpaRepository<Localizacao, Long> {
}
```

---

### 6. Criar o Service (camada de negócio)

Pacote `com.smartparkuscs.mapbackend.service`:

```java
package com.smartparkuscs.mapbackend.service;

import com.smartparkuscs.mapbackend.model.Localizacao;
import com.smartparkuscs.mapbackend.repository.LocalizacaoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class LocalizacaoService {

    @Autowired
    private LocalizacaoRepository repository;

    public List<Localizacao> findAll() {
        return repository.findAll();
    }

    public Localizacao save(Localizacao localizacao) {
        return repository.save(localizacao);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }

    public Localizacao findById(Long id) {
        return repository.findById(id).orElse(null);
    }
}
```

---

### 7. Criar o Controller REST

Pacote `com.smartparkuscs.mapbackend.controller`:

```java
package com.smartparkuscs.mapbackend.controller;

import com.smartparkuscs.mapbackend.model.Localizacao;
import com.smartparkuscs.mapbackend.service.LocalizacaoService;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/localizacoes")
@CrossOrigin(origins = "*") // Permite requisições de qualquer origem (apenas para testes)
public class LocalizacaoController {

    @Autowired
    private LocalizacaoService service;

    // Listar todas as localizações
    @GetMapping
    public List<Localizacao> getAll() {
        return service.findAll();
    }

    // Buscar por ID
    @GetMapping("/{id}")
    public ResponseEntity<Localizacao> getById(@PathVariable Long id) {
        Localizacao loc = service.findById(id);
        if (loc != null) {
            return ResponseEntity.ok(loc);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Criar uma nova localização (recebe um JSON com nome e coordenadas)
    @PostMapping
    public Localizacao create(@RequestBody Localizacao localizacao) {
        return service.save(localizacao);
    }

    // Deletar por ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Endpoint auxiliar para criar uma localização a partir de latitude e longitude
    @PostMapping("/criar")
    public Localizacao criarPorLatLon(@RequestParam String nome,
                                      @RequestParam double lat,
                                      @RequestParam double lon) {
        GeometryFactory gf = new GeometryFactory();
        Point point = gf.createPoint(new Coordinate(lon, lat));
        point.setSRID(4326); // Define o sistema de coordenadas geográficas (WGS84)
        Localizacao loc = new Localizacao(nome, point);
        return service.save(loc);
    }
}
```

---

### 8. Classe Principal (já existe)

O arquivo **`MapbackendApplication.java`** (ou similar) já foi gerado com a anotação `@SpringBootApplication`. Não precisa alterar nada.

---

### 9. Executar o Backend

- No VSCode, localize a classe principal (com o ícone de “play” ao lado).
- Clique em **Run** ou use o terminal:
  ```bash
  ./mvnw spring-boot:run
  ```
- O servidor iniciará na porta **8080**.

---

### 10. Testar a API

Use o Postman, Insomnia ou o próprio navegador para testar.

- **GET** `http://localhost:8080/api/localizacoes` → lista vazia (ainda sem dados)
- **POST** `http://localhost:8080/api/localizacoes/criar?nome=Exemplo&lat=-23.5505&lon=-46.6333` → cria um ponto com nome "Exemplo" e coordenadas de São Paulo.
- **GET** novamente → agora a lista mostrará o ponto criado.

Você também pode fazer um **POST** enviando um JSON no corpo da requisição para o endpoint `/api/localizacoes`:
```json
{
  "nome": "Outro Local",
  "coordenadas": {
    "x": -46.6333,
    "y": -23.5505
  }
}
```
**Atenção:** o `Point` usa `x` para longitude e `y` para latitude.

---

### 11. (Opcional) Adicionar um DTO para retornar lat/lon separadamente

Se quiser que o endpoint GET retorne um JSON com `lat` e `lon` em vez de um objeto `Point` (que é mais complexo), você pode criar um DTO ou modificar o controller para retornar um `Map`. Exemplo:

```java
@GetMapping
public List<Map<String, Object>> getAllWithCoords() {
    List<Localizacao> locs = service.findAll();
    List<Map<String, Object>> result = new ArrayList<>();
    for (Localizacao loc : locs) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", loc.getId());
        map.put("nome", loc.getNome());
        map.put("lat", loc.getCoordenadas().getY());
        map.put("lon", loc.getCoordenadas().getX());
        result.add(map);
    }
    return result;
}
```

Lembre-se de importar `java.util.HashMap` e `java.util.Map`.

---

## 📁 Estrutura Final do Projeto

```
mapbackend/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/mapbackend/
│   │   │       ├── MapbackendApplication.java
│   │   │       ├── controller/
│   │   │       │   └── LocalizacaoController.java
│   │   │       ├── model/
│   │   │       │   └── Localizacao.java
│   │   │       ├── repository/
│   │   │       │   └── LocalizacaoRepository.java
│   │   │       └── service/
│   │   │           └── LocalizacaoService.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── static/ (opcional)
│   └── test/
└── ...
```

---

## 🧪 Dicas e Soluções de Problemas

- **Erro de dialeto**: Se o MySQL for versão 8, você pode usar `org.hibernate.spatial.dialect.mysql.MySQL8SpatialDialect`.
- **Erro de SRID**: Ao criar o `Point`, defina `setSRID(4326)` para coordenadas WGS84 (latitude/longitude).
- **CORS**: O `@CrossOrigin(origins = "*")` permite que qualquer frontend acesse a API. Em produção, restrinja para o domínio do seu app.
- **Porta em uso**: Se a porta 8080 estiver ocupada, altere em `application.properties`: `server.port=8081`.

---

Agora você já tem um backend funcional para seu app de mapeamento com Java, Spring Boot, MySQL e suporte a dados geoespaciais. Basta integrar com o Flutter consumindo os endpoints REST. 🚀