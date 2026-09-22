# Giải Thích Toàn Bộ AI Service — Từ Đầu

## Mục lục
1. [Tại sao dùng Python thay vì Java?](#1-tại-sao-dùng-python-thay-vì-java)
2. [FastAPI là gì? So sánh với Spring Boot](#2-fastapi-là-gì)
3. [Cấu trúc thư mục — Mỗi file làm gì?](#3-cấu-trúc-thư-mục)
4. [File 1: config.py — Quản lý cấu hình](#4-configpy)
5. [File 2: database.py — Kết nối PostgreSQL](#5-databasepy)
6. [File 3: rabbitmq.py — Hàng đợi tin nhắn](#6-rabbitmqpy)
7. [File 4: models/__init__.py — Định nghĩa bảng DB](#7-models)
8. [File 5: health.py — API kiểm tra sức khỏe](#8-healthpy)
9. [File 6: main.py — Điểm khởi chạy ứng dụng](#9-mainpy)
10. [Luồng hoạt động tổng thể](#10-luồng-hoạt-động)

---

## 1. Tại sao dùng Python thay vì Java?

Toàn bộ hệ thống ATS hiện tại viết bằng **Java + Spring Boot**. Vậy tại sao `ai-service` lại dùng **Python + FastAPI**?

| Tiêu chí | Java (Spring Boot) | Python (FastAPI) |
|:---|:---|:---|
| **Thư viện AI/ML** | Rất ít, khó dùng | ✅ Phong phú nhất (OpenAI SDK, PyMuPDF, PaddleOCR, sentence-transformers...) |
| **Gọi LLM API** | Phải viết HTTP client thủ công | ✅ `openai` SDK chỉ cần 3 dòng code |
| **Xử lý PDF** | Apache PDFBox (chậm, API cũ) | ✅ PyMuPDF (nhanh gấp 10-50x) |
| **OCR** | Rất khó tích hợp | ✅ PaddleOCR (1 dòng lệnh) |
| **Vector embedding** | Hầu như không có | ✅ sentence-transformers, pgvector |

> **Kết luận:** Python là ngôn ngữ chuẩn của AI/ML. Các Java services giữ nguyên vai trò quản lý nghiệp vụ, `ai-service` (Python) chỉ xử lý phần AI.

---

## 2. FastAPI là gì?

**FastAPI** là web framework của Python, tương đương với **Spring Boot** của Java. So sánh nhanh:

```
Spring Boot (Java)          ↔     FastAPI (Python)
─────────────────────              ─────────────────
@RestController             ↔     @router.get() / @router.post()
@GetMapping("/health")      ↔     @router.get("/health")
@Autowired (DI)             ↔     Depends() (DI)
application.yml             ↔     .env + pydantic Settings
JPA / Hibernate             ↔     SQLAlchemy (ORM)
@Entity                     ↔     class AIJob(Base) (ORM Model)
@SpringBootApplication      ↔     FastAPI() + lifespan
pom.xml (Maven)             ↔     requirements.txt (pip)
```

### Điểm khác biệt quan trọng: `async/await`

Python FastAPI dùng **lập trình bất đồng bộ (async)**. Hãy hiểu đơn giản:

```python
# ❌ Đồng bộ (blocking) — như Java truyền thống
def get_data():
    result = db.query("SELECT * FROM users")  # ⏳ Đợi DB trả về, không làm gì khác
    return result

# ✅ Bất đồng bộ (async) — FastAPI dùng cách này
async def get_data():
    result = await db.execute("SELECT * FROM users")  # ⏳ Đợi DB, nhưng CPU rảnh đi xử lý request khác
    return result
```

**`async`** = khai báo "hàm này có thể chờ đợi"
**`await`** = "chờ kết quả ở đây, nhưng cho phép xử lý việc khác trong lúc chờ"

> Giống như bạn gọi món ở nhà hàng: thay vì đứng chờ bếp nấu (blocking), bạn ngồi xuống làm việc khác và bếp sẽ gọi khi xong (async).

---

## 3. Cấu trúc thư mục

```
ai-service/
├── app/                        ← 📦 Mã nguồn chính
│   ├── main.py                 ← 🚀 Điểm khởi chạy (như @SpringBootApplication)
│   ├── api/                    ← 🌐 Các API endpoints (như @RestController)
│   │   └── health.py           ← API kiểm tra sức khỏe hệ thống
│   ├── core/                   ← ⚙️ Cấu hình nền tảng
│   │   ├── config.py           ← Đọc biến môi trường (như application.yml)
│   │   ├── database.py         ← Kết nối PostgreSQL (như JPA DataSource)
│   │   └── rabbitmq.py         ← Kết nối RabbitMQ (như RabbitMQConfig.java)
│   ├── models/                 ← 📊 Định nghĩa bảng DB (như @Entity)
│   │   └── __init__.py         ← AIJob, CVDocumentChunk, AIFeedback
│   ├── schemas/                ← 📋 Request/Response DTO (như DTO trong Java)
│   ├── services/               ← 🧠 Business logic (như @Service trong Java)
│   └── workers/                ← 👷 RabbitMQ consumers (như @RabbitListener)
├── alembic/                    ← 🔄 DB migrations (như Flyway trong Java)
├── Dockerfile                  ← 🐳 Build Docker image
├── requirements.txt            ← 📦 Dependencies (như pom.xml)
└── .env.example                ← 🔑 Template cấu hình
```

> [!TIP]
> File `__init__.py` trong mỗi thư mục là quy ước của Python. Nó đánh dấu thư mục đó là một **package** (tương tự như `package` declaration trong Java). Có thể để trống hoặc chứa code.

---

## 4. config.py — Quản lý cấu hình

📄 [config.py](file:///d:/KLTN/ATS/ai-service/app/core/config.py)

### Vai trò
Tương đương `application.yml` trong Spring Boot. Đọc các biến môi trường (env vars) và cung cấp cho toàn bộ ứng dụng.

### Giải thích từng phần

```python
from pydantic_settings import BaseSettings    # Thư viện đọc env vars tự động
from functools import lru_cache               # Cache kết quả hàm (gọi 1 lần, dùng mãi)


class Settings(BaseSettings):
    """Khai báo TẤT CẢ config của app ở đây."""

    # Mỗi field = 1 biến môi trường
    # Nếu env var không có → dùng giá trị mặc định (sau dấu =)
    
    app_name: str = "ATS AI Service"           # Tên ứng dụng
    database_url: str = "postgresql+asyncpg://ats_user:ats_password@localhost:5432/ats_ai"
    rabbitmq_url: str = "amqp://ats_user:ats_password@localhost:5672/"
    openai_api_key: str = ""                   # API key OpenAI (cần điền)
    # ... các config khác ...

    model_config = {
        "env_file": ".env",          # Đọc từ file .env nếu có
        "case_sensitive": False,     # DATABASE_URL = database_url = OK
    }
```

### Cơ chế hoạt động

```
Ưu tiên đọc config:
1. Biến môi trường hệ thống (OS env vars)     ← Cao nhất
2. File .env trong thư mục project
3. Giá trị mặc định trong code                ← Thấp nhất
```

### So sánh với Java

```yaml
# Java Spring Boot — application.yml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/ats_ai}
```

```python
# Python FastAPI — config.py
database_url: str = "postgresql+asyncpg://ats_user:ats_password@localhost:5432/ats_ai"
```

Cả hai đều: khai báo giá trị mặc định, cho phép ghi đè bằng env var.

### `@lru_cache` là gì?

```python
@lru_cache        # ← "Gọi hàm lần đầu → lưu kết quả. Lần sau gọi lại → trả kết quả cũ, không tạo mới"
def get_settings() -> Settings:
    return Settings()
```

Giống như **Singleton pattern** trong Java. Đảm bảo chỉ có **1 instance** Settings duy nhất trong toàn bộ app.

---

## 5. database.py — Kết nối PostgreSQL

📄 [database.py](file:///d:/KLTN/ATS/ai-service/app/core/database.py)

### Vai trò
Tương đương cấu hình JPA/Hibernate DataSource trong Spring Boot. Tạo kết nối tới PostgreSQL, quản lý connection pool.

### Giải thích từng phần

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# 1. Tạo "engine" — connection pool tới PostgreSQL
engine = create_async_engine(
    settings.database_url,     # "postgresql+asyncpg://user:pass@host:5432/db"
    echo=settings.debug,       # True = in SQL ra console (debug)
    pool_size=10,              # Giữ tối đa 10 connections mở sẵn
    max_overflow=20,           # Cho phép thêm 20 connections nếu cần
)

# 2. Tạo "session factory" — mỗi request sẽ lấy 1 session từ đây
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,    # Sau commit, object vẫn truy cập được (không lazy load)
)
```

### `Base` class — ORM base

```python
class Base(DeclarativeBase):
    """Tất cả model DB sẽ kế thừa class này."""
    pass
```

Tương đương: mọi `@Entity` trong Java đều extends một base class chung.

### `get_db()` — Dependency Injection

```python
async def get_db() -> AsyncSession:
    """FastAPI dependency: mỗi request nhận 1 DB session."""
    async with async_session_factory() as session:
        try:
            yield session          # ← Trả session cho route handler dùng
            await session.commit() # ← Request xong → auto commit
        except Exception:
            await session.rollback()  # ← Lỗi → auto rollback
            raise
```

So sánh với Java:
```java
// Spring Boot tự inject EntityManager / JpaRepository
@Autowired
private ApplicationRepository repo;
```

```python
# FastAPI inject DB session qua Depends()
@router.get("/data")
async def get_data(db: AsyncSession = Depends(get_db)):
    result = await db.execute(...)
```

> `yield` là gì? Giống `try-with-resources` trong Java. Code trước `yield` = setup, code sau `yield` = cleanup.

---

## 6. rabbitmq.py — Hàng đợi tin nhắn

📄 [rabbitmq.py](file:///d:/KLTN/ATS/ai-service/app/core/rabbitmq.py)

### Vai trò
Tương đương [RabbitMQConfig.java](file:///d:/KLTN/ATS/application-service/src/main/java/iuh/fit/se/application/config/RabbitMQConfig.java) trong các Java services. Khai báo exchange, queue, binding.

### Luồng message trong hệ thống

```
application-service (Java)                    ai-service (Python)
────────────────────                          ─────────────────
Ứng viên nộp CV                                     
    │                                                
    ▼                                                
Publish message ──► RabbitMQ ──► Consume message     
routing_key:        Exchange:     Queue:              
"cv.uploaded"       "ats.events"  "ai.cv-uploaded.queue"
                                      │               
                                      ▼               
                                 AI xử lý CV...       
                                      │               
                                      ▼               
                                 Publish kết quả ──► RabbitMQ ──► application-service
                                 routing_key:         Queue:       (Java, cập nhật UI)
                                 "ai.scoring.completed"            
```

### Giải thích code

```python
# Hằng số — đặt tên giống Java RabbitMQConfig
ATS_EXCHANGE = "ats.events"                    # Exchange chung toàn hệ thống
CV_UPLOADED_QUEUE = "ai.cv-uploaded.queue"      # Queue AI service lắng nghe
CV_UPLOADED_ROUTING_KEY = "cv.uploaded"         # Routing key từ Java publish
```

```python
class RabbitMQManager:
    """Quản lý kết nối RabbitMQ xuyên suốt vòng đời app."""

    async def connect(self) -> None:
        # 1. Mở kết nối tới RabbitMQ server
        self._connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        
        # 2. Tạo channel (kênh giao tiếp)
        self._channel = await self._connection.channel()
        
        # 3. Khai báo exchange (tương đương TopicExchange bean trong Java)
        self._exchange = await self._channel.declare_exchange(
            ATS_EXCHANGE, ExchangeType.TOPIC, durable=True
        )
        
        # 4. Khai báo queue + bind vào exchange
        cv_queue = await self._channel.declare_queue(CV_UPLOADED_QUEUE, durable=True)
        await cv_queue.bind(self._exchange, routing_key=CV_UPLOADED_ROUTING_KEY)
```

So sánh với Java:
```java
// Java Spring Boot — khai báo queue
@Bean
public Queue offerAcceptedQueue() {
    return QueueBuilder.durable(OFFER_ACCEPTED_QUEUE).build();
}

@Bean
public Binding offerAcceptedBinding(Queue queue, TopicExchange exchange) {
    return BindingBuilder.bind(queue).to(exchange).with(OFFER_ACCEPTED_ROUTING_KEY);
}
```

Logic hoàn toàn giống nhau, chỉ khác cú pháp.

### `publish()` — Gửi message

```python
async def publish(self, routing_key: str, body: bytes) -> None:
    message = aio_pika.Message(
        body=body,                                    # Nội dung JSON
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,  # Không mất khi RabbitMQ restart
        content_type="application/json",
    )
    await self.exchange.publish(message, routing_key=routing_key)
```

---

## 7. models/__init__.py — Định nghĩa bảng DB

📄 [models/__init__.py](file:///d:/KLTN/ATS/ai-service/app/models/__init__.py)

### Vai trò
Tương đương `@Entity` trong JPA/Hibernate. Định nghĩa cấu trúc bảng trong PostgreSQL.

### So sánh cú pháp

```java
// Java — JPA Entity
@Entity
@Table(name = "ai_jobs")
public class AIJob {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long applicationId;

    @Column(length = 50, nullable = false)
    private String status = "QUEUED";

    @Column(columnDefinition = "jsonb")
    private String guardrailWarnings;
}
```

```python
# Python — SQLAlchemy Model
class AIJob(Base):
    __tablename__ = "ai_jobs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    application_id = Column(BigInteger, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="QUEUED")
    guardrail_warnings = Column(JSONB)
```

### 3 bảng AI

| Bảng | Vai trò | Tương tự trong hệ thống |
|:---|:---|:---|
| `ai_jobs` | Theo dõi mỗi lần AI xử lý CV (status, model version, chi phí, thời gian) | Như bảng `application` nhưng cho AI processing |
| `cv_document_chunks` | Lưu từng đoạn CV đã embedding thành vector 1024 chiều (cho semantic search) | **Mới hoàn toàn** — đây là phần RAG |
| `ai_feedback` | Lưu phản hồi của recruiter về kết quả AI (đồng ý / chỉnh score / báo lỗi) | Như audit log nhưng cho AI |

### Đặc biệt: `Vector(1024)`

```python
from pgvector.sqlalchemy import Vector

class CVDocumentChunk(Base):
    embedding = Column(Vector(1024))   # ← Vector 1024 chiều, dùng pgvector
```

Đây là kiểu dữ liệu đặc biệt của **pgvector** (PostgreSQL extension). Mỗi đoạn CV được chuyển thành 1 vector 1024 số thực. Khi cần tìm đoạn CV nào liên quan nhất tới yêu cầu tuyển dụng, ta dùng **cosine similarity** trên các vector này.

---

## 8. health.py — API kiểm tra sức khỏe

📄 [health.py](file:///d:/KLTN/ATS/ai-service/app/api/health.py)

### Vai trò
API đơn giản nhất — kiểm tra service có đang chạy không, DB có kết nối được không.

### API 1: Basic health check

```python
@router.get("/health")                           # ← Khai báo route GET /health
async def health_check(
    settings: Settings = Depends(get_settings),   # ← Dependency Injection
):
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat(),
    }
```

Khi gọi `GET /api/v1/ai/health`, trả về:
```json
{
    "status": "ok",
    "service": "ATS AI Service",
    "version": "0.1.0",
    "timestamp": "2026-09-07T12:00:00"
}
```

### API 2: Detailed health check

```python
@router.get("/health/detailed")
async def detailed_health_check(
    db: AsyncSession = Depends(get_db),           # ← Inject DB session
    settings: Settings = Depends(get_settings),
):
    # Kiểm tra DB kết nối được không
    result = await db.execute(text("SELECT 1"))   # ← Chạy SQL đơn giản
    
    # Kiểm tra pgvector extension đã cài chưa
    result = await db.execute(
        text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
    )
```

### `Depends()` — Dependency Injection

```python
# FastAPI tự động:
# 1. Gọi get_db() → tạo DB session
# 2. Truyền session vào tham số `db`
# 3. Khi request xong → tự commit/rollback + đóng session

async def detailed_health_check(
    db: AsyncSession = Depends(get_db),       # "Hãy tạo cho tôi 1 DB session"
    settings: Settings = Depends(get_settings) # "Hãy cho tôi object Settings"
):
```

Tương đương `@Autowired` trong Spring Boot, nhưng tường minh hơn (explicit).

### `router` là gì?

```python
router = APIRouter()   # ← Nhóm các endpoint lại với nhau

@router.get("/health")          # Endpoint 1
async def health_check(): ...

@router.get("/health/detailed") # Endpoint 2
async def detailed_health(): ...
```

Tương đương `@RestController` trong Java — nhóm các endpoint liên quan.

---

## 9. main.py — Điểm khởi chạy ứng dụng

📄 [main.py](file:///d:/KLTN/ATS/ai-service/app/main.py)

### Vai trò
Tương đương class chứa `@SpringBootApplication` + `main()` trong Java. Đây là nơi mọi thứ bắt đầu.

### Giải thích từng phần

#### Lifespan — Startup/Shutdown hooks

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Chạy khi app khởi động và khi app tắt."""
    
    # === STARTUP (khi app bật) ===
    await rabbitmq_manager.connect()      # Kết nối RabbitMQ
    logger.info("RabbitMQ connected.")
    
    yield    # ← App đang chạy, phục vụ request ở đây...
    
    # === SHUTDOWN (khi app tắt) ===
    await rabbitmq_manager.disconnect()   # Ngắt kết nối RabbitMQ
    logger.info("Shutdown complete.")
```

Tương đương trong Spring Boot:
```java
@PostConstruct    // ← Startup
public void init() { ... }

@PreDestroy       // ← Shutdown
public void cleanup() { ... }
```

#### Application Factory

```python
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/api/v1/ai/docs",        # Swagger UI tại URL này
        lifespan=lifespan,                   # Gắn startup/shutdown hooks
    )

    # CORS — cho phép frontend gọi API
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5173"],
        allow_methods=["*"],
    )

    # Đăng ký router — gắn các endpoint vào app
    app.include_router(health_router, prefix="/api/v1/ai", tags=["Health"])
    # → /health trở thành /api/v1/ai/health

    return app


app = create_app()   # ← Tạo instance app
```

#### Cách chạy

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8088
#       ^^^^^^^^^^^
#       module_path:variable_name
#       Tìm file app/main.py, lấy biến `app` (FastAPI instance)
```

Tương đương `java -jar app.jar` nhưng cần chỉ rõ module + biến.

---

## 10. Luồng hoạt động tổng thể

### Khi `docker compose up` chạy

```mermaid
sequenceDiagram
    participant Docker
    participant Python as ai-service (Python)
    participant PG as PostgreSQL (pgvector)
    participant RMQ as RabbitMQ

    Docker->>PG: 1. Start PostgreSQL
    Docker->>PG: 2. Chạy init-databases.sql
    Note over PG: CREATE DATABASE ats_ai<br/>CREATE EXTENSION vector<br/>CREATE TABLE ai_jobs...<br/>CREATE TABLE cv_document_chunks...<br/>CREATE TABLE ai_feedback...
    Docker->>RMQ: 3. Start RabbitMQ
    Docker->>Python: 4. Start ai-service
    Python->>Python: 5. main.py → create_app()
    Python->>Python: 6. lifespan() → STARTUP
    Python->>RMQ: 7. Kết nối RabbitMQ
    Python->>RMQ: 8. Khai báo exchange "ats.events"
    Python->>RMQ: 9. Khai báo queue "ai.cv-uploaded.queue"
    Python->>RMQ: 10. Bind queue với routing key "cv.uploaded"
    Note over Python: ✅ Sẵn sàng phục vụ request tại port 8088
```

### Khi có request `GET /api/v1/ai/health`

```mermaid
sequenceDiagram
    participant Client as Browser/curl
    participant GW as API Gateway (:8080)
    participant AI as ai-service (:8088)

    Client->>GW: GET /api/v1/ai/health
    Note over GW: Route match: /api/v1/ai/** → ai-service
    GW->>AI: Forward request
    AI->>AI: health_check() chạy
    AI-->>GW: {"status": "ok", ...}
    GW-->>Client: 200 OK
```

### Khi có request `GET /api/v1/ai/health/detailed`

```mermaid
sequenceDiagram
    participant Client
    participant AI as ai-service
    participant PG as PostgreSQL

    Client->>AI: GET /api/v1/ai/health/detailed
    AI->>AI: Depends(get_db) → tạo DB session
    AI->>PG: SELECT 1 (test connection)
    PG-->>AI: OK
    AI->>PG: SELECT extname FROM pg_extension WHERE extname='vector'
    PG-->>AI: "vector"
    AI->>AI: Session auto-commit + close
    AI-->>Client: {"status":"ok", "checks":{"database":"ok","pgvector":"ok"}}
```

---

## Tóm tắt: Mapping Java ↔ Python

| Khái niệm | Java Spring Boot | Python FastAPI |
|:---|:---|:---|
| Entry point | `@SpringBootApplication` + `main()` | `create_app()` + `uvicorn` |
| Config | `application.yml` | `.env` + `pydantic Settings` |
| REST Controller | `@RestController` + `@GetMapping` | `APIRouter` + `@router.get()` |
| Dependency Injection | `@Autowired` | `Depends()` |
| ORM Entity | `@Entity` + JPA | `class Model(Base)` + SQLAlchemy |
| DB Connection | `spring.datasource.*` | `create_async_engine()` |
| Message Queue | `@Bean Queue` + `@RabbitListener` | `aio_pika` + `declare_queue()` |
| DB Migration | Flyway (`V1__*.sql`) | Alembic (`alembic/versions/`) |
| Dependencies | `pom.xml` (Maven) | `requirements.txt` (pip) |
| Build | `mvn clean package` | `pip install -r requirements.txt` |
| Docker | `FROM maven:... → FROM eclipse-temurin:...` | `FROM python:3.11-slim` |
| Startup hook | `@PostConstruct` | `lifespan()` (yield trước) |
| Shutdown hook | `@PreDestroy` | `lifespan()` (yield sau) |
