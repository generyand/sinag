# SINAG API (FastAPI Backend)

Backend API service for the SINAG application built with **FastAPI** and **Python 3.13**.

## 🚀 **Quick Start**

```bash
# From monorepo root
pnpm dev:api

# Or from this directory
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## 📋 **Available Commands**

### **Development**
```bash
# Start development server with hot reload
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start via monorepo (recommended)
pnpm dev:api
```

### **Testing**
```bash
# Run all tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=app --cov-report=html

# Run specific test file
uv run pytest tests/test_auth.py

# Run tests with verbose output
uv run pytest -v
```

### **Linting & Formatting**
```bash
# Run linting
uv run ruff check

# Auto-fix linting issues
uv run ruff check --fix

# Format code
uv run ruff format

# Type checking
uv run mypy app/
```

### **Database Operations**
```bash
# Apply all pending migrations
uv run alembic upgrade head

# Create new migration from model changes
uv run alembic revision --autogenerate -m "description"

# Check current migration status
uv run alembic current

# Show migration history
uv run alembic history

# Rollback one migration
uv run alembic downgrade -1

# Reset database (use with caution!)
uv run alembic downgrade base
```

### **Dependencies**
```bash
# Add new dependency
uv add package-name

# Add development dependency
uv add --dev package-name

# Update dependencies
uv sync

# Show dependency tree
uv tree
```

## 🛠️ **Development Tools**

### **API Documentation**
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

### **Health Checks**
- **Health**: `GET /health`
- **Root**: `GET /`

## 🏗️ **Project Structure**

```
apps/api/
├── app/                      # Main application package
│   ├── api/                  # API Layer (Routers)
│   │   ├── deps.py           # Reusable FastAPI dependencies
│   │   ├── __init__.py
│   │   └── v1/               # API versioning (v1)
│   │       ├── auth.py       # Authentication endpoints
│   │       ├── users.py      # User management endpoints
│   │       ├── assessments.py # SGLGB assessment endpoints
│   │       ├── reports.py    # Analytics and reporting
│   │       └── __init__.py
│   │
│   ├── core/                 # Core application configuration
│   │   ├── config.py         # Pydantic settings management
│   │   ├── security.py       # JWT tokens & password hashing
│   │   └── __init__.py
│   │
│   ├── db/                   # Database specific code
│   │   ├── base.py           # SQLAlchemy engine & session
│   │   ├── models/           # SQLAlchemy ORM models
│   │   │   ├── user.py       # User model
│   │   │   ├── auth.py       # Auth model
│   │   │   ├── project.py    # Project model
│   │   │   ├── system.py     # System model
│   │   │   ├── assessment.py # Assessment model (planned)
│   │   │   ├── mov.py        # MOV file model (planned)
│   │   │   └── __init__.py
│   │   └── __init__.py
│   │
│   ├── schemas/              # Pydantic API schemas (DTOs)
│   │   ├── token.py          # JWT token schemas (planned)
│   │   ├── user.py           # User request/response schemas (planned)
│   │   ├── assessment.py     # Assessment schemas (planned)
│   │   ├── msg.py            # Generic message schemas (planned)
│   │   └── __init__.py
│   │
│   ├── services/             # Business Logic Layer
│   │   ├── user_service.py   # User business logic (planned)
│   │   ├── assessment_service.py # Assessment logic (planned)
│   │   └── __init__.py
│   │
│   └── workers/              # Background tasks & algorithms
│       ├── sglgb_classifier.py # SGLGB leadership classifier
│       └── __init__.py
│
├── tests/                    # Test files
│   ├── conftest.py          # Shared test fixtures
│   ├── test_auth.py         # Authentication tests
│   ├── test_users.py        # User management tests
│   └── test_assessments.py  # Assessment tests
│
├── main.py                  # FastAPI application entry point
├── pyproject.toml          # Python project configuration
├── uv.lock                 # Dependency lockfile
├── README.md               # This documentation
└── .env.example            # Environment variables template
```

### **Architecture Layers**

#### **🌐 API Layer** (`app/api/`)
- **Versioned endpoints** for future compatibility
- **Dependency injection** for auth, database sessions
- **Route handlers** with proper HTTP status codes
- **Request/response validation** with Pydantic

#### **⚙️ Core Layer** (`app/core/`)
- **Configuration management** with environment variables
- **Security utilities** for JWT tokens and password hashing
- **Application settings** centralized in one place

#### **🗄️ Database Layer** (`app/db/`)
- **SQLAlchemy models** mirroring database tables
- **Database session management** with connection pooling
- **Migration support** with Alembic (planned)

#### **📋 Schema Layer** (`app/schemas/`)
- **API contracts** defining request/response structures
- **Data validation** with Pydantic models
- **Type safety** for frontend integration

#### **🔧 Service Layer** (`app/services/`)
- **Business logic** separated from API routes
- **Data access patterns** with repository design
- **Domain operations** independent of HTTP concerns

#### **🧠 Workers Layer** (`app/workers/`)
- **Background processing** with Celery integration
- **SGLGB classification** algorithm for leadership assessment
- **Asynchronous tasks** for heavy computations

## 🔗 **API Endpoints**

| Method | Endpoint | Description | Tag |
|--------|----------|-------------|-----|
| `GET` | `/` | Welcome message | system |
| `GET` | `/health` | Health check | system |
| `GET` | `/api/hello` | Hello world | system |
| `POST` | `/api/auth/login` | User login | auth |
| `POST` | `/api/auth/logout` | User logout | auth |
| `GET` | `/api/users/me` | Get current user | users |
| `GET` | `/api/projects` | List projects | projects |

## 🏷️ **Endpoint Tags**

Endpoints are organized by feature areas using FastAPI tags:

- **auth**: Authentication and authorization
- **users**: User management and profiles  
- **projects**: Project CRUD operations
- **system**: Health checks and system information

These tags are used for generating organized TypeScript types.

## 📦 **Dependencies**

This project uses carefully selected dependencies to provide a robust, secure, and scalable backend API.

### **Production Dependencies**

| Package | Version | Purpose | Used In |
|---------|---------|---------|---------|
| **`fastapi`** | `>=0.115.12` | Modern web framework for building APIs | Core application framework |
| **`uvicorn`** | `>=0.34.3` | ASGI server for running FastAPI | Production server |
| **`sqlalchemy`** | `>=2.0.41` | SQL toolkit and ORM | Database operations |
| **`alembic`** | `>=1.16.2` | Database migration tool | Schema versioning |
| **`psycopg2-binary`** | `>=2.9.10` | PostgreSQL database adapter | Database connectivity |
| **`pydantic[email]`** | `>=2.11.7` | Data validation with email support | Settings, schemas, validation |
| **`python-dotenv`** | `>=1.1.0` | Load environment variables from .env | Configuration management |
| **`python-jose[cryptography]`** | `>=3.5.0` | JWT token creation/verification | Authentication system |
| **`passlib[bcrypt]`** | `>=1.7.4` | Password hashing library | Secure password storage |
| **`python-multipart`** | `>=0.0.20` | Multipart form data parsing | File upload handling |
| **`redis`** | `>=6.2.0` | In-memory data store | Caching, session storage |
| **`celery`** | `>=5.5.3` | Distributed task queue | Background processing |
| **`loguru`** | `>=0.7.3` | Enhanced logging with structure | Application logging |
| **`supabase`** | `>=2.15.3` | Supabase client for database & auth | Database operations, real-time features |

### **Development Dependencies**

| Package | Version | Purpose | Used For |
|---------|---------|---------|----------|
| **`pytest`** | `>=8.4.0` | Testing framework | Unit and integration tests |
| **`pytest-asyncio`** | `>=1.0.0` | Async testing support | FastAPI async endpoint testing |
| **`httpx`** | `>=0.28.1` | HTTP client for testing | API endpoint testing |
| **`factory-boy`** | `>=3.3.3` | Test data generation | Creating test fixtures |
| **`mypy`** | `>=1.16.0` | Static type checking | Code quality assurance |
| **`ruff`** | `>=0.11.13` | Fast Python linter and formatter | Code style enforcement |

### **Key Features Enabled**

#### **🔐 Security & Authentication**
- **JWT Tokens**: Stateless authentication with `python-jose`
- **Password Security**: Bcrypt hashing with `passlib`
- **Input Validation**: Type-safe validation with `pydantic`

#### **📁 File Processing**
- **File Uploads**: Multipart form handling for MOV files
- **Background Tasks**: Celery-powered video classification
- **Caching**: Redis for performance optimization

#### **🧪 Testing & Development**
- **Async Testing**: Full FastAPI test coverage
- **Type Safety**: Static analysis with mypy
- **Code Quality**: Automated formatting and linting
- **Test Data**: Factory-based fixture generation

#### **🗄️ Database Operations**
- **Supabase Client**: Real-time subscriptions, auth, and storage
- **SQLAlchemy ORM**: Complex queries and transactions
- **Dual Database Access**: Supabase client + direct PostgreSQL
- **Connection Pooling**: Optimized for Supabase infrastructure
- **Migrations**: Alembic support for schema management

#### **📊 Monitoring & Logging**
- **Structured Logging**: JSON-formatted logs with Loguru
- **Health Checks**: Built-in endpoint monitoring
- **Performance Tracking**: Redis-based metrics

### **Installation Commands**

```bash
# Install all production dependencies
uv sync

# Add new production dependency
uv add package-name

# Add new development dependency
uv add --dev package-name

# Update all dependencies
uv sync --upgrade

# View dependency tree
uv tree
```

## 🔧 **Supabase Database Setup**

This project uses **Supabase** as the backend database service. Follow these steps to set up your database:

### **1. Create a Supabase Project**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization and fill in project details:
   - **Name**: `sinag-api` (or your preferred name)
   - **Database Password**: Use a strong password
   - **Region**: Choose closest to your users
4. Wait for the project to be created (~2 minutes)

### **2. Get Your Supabase Credentials**

From your Supabase project dashboard:

1. **Project URL & API Keys**: Go to `Settings > API`
   - **URL**: Your project URL (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**: Safe for client-side use
   - **service_role key**: Server-side only (keep secret!)

2. **Database Connection String**: Go to `Settings > Database > Connection string`
   - Select **URI** tab
   - Copy the connection string

### **3. Connection Types and Network Compatibility**

Supabase offers multiple ways to connect to your database:

#### **Direct Connection (IPv6 Only)**
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```
⚠️ **Note**: The direct connection uses IPv6 by default. If your network does not support IPv6, you **must** use one of the Supavisor connection options below.

#### **Supavisor Transaction Mode (IPv4 Compatible)**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```
✅ **Recommended for**: Environments without IPv6 support, serverless functions, or transient connections.

#### **Supavisor Session Mode (IPv4 Compatible)**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```
✅ **Recommended for**: Persistent connections that need IPv4 compatibility and prepared statements.

If your network does not support IPv6 (as indicated by ping failures to IPv6 addresses), you **must** use the Supavisor Transaction Mode connection string (port 6543) or Session Mode (port 5432).

### **4. Configure Environment Variables**

Create a `.env` file (copy from `.env.example`):

```bash
# 🗄️ SUPABASE CONFIGURATION
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# 🗄️ DATABASE CONNECTION
# For IPv6 environments (direct connection):
# DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# For IPv4 environments (via Supavisor transaction pooler):
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# 🔐 SECURITY
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# 🌍 APPLICATION
DEBUG=true
ENVIRONMENT=development

# 🌐 CORS
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# 📁 FILE UPLOADS
MAX_FILE_SIZE=104857600
UPLOAD_FOLDER=uploads

# 🔄 BACKGROUND TASKS
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### **5. Database Features Available**

With Supabase, you get access to:

- **PostgreSQL Database**: Full SQL database with ACID compliance
- **Real-time Subscriptions**: Live data updates via websockets
- **Built-in Authentication**: User management and JWT tokens
- **Row Level Security**: Fine-grained access control
- **Storage**: File upload and management
- **Edge Functions**: Server-side logic
- **Auto-generated APIs**: RESTful and GraphQL endpoints

### **6. Development Tools**

- **Supabase Dashboard**: `https://supabase.com/dashboard/project/[your-project-ref]`
- **Database GUI**: Built-in table editor and SQL editor
- **API Documentation**: Auto-generated from your schema
- **Logs & Analytics**: Real-time monitoring

## 🗄️ **Database Migrations with Alembic**

This project uses **Alembic** for database schema migrations with SQLAlchemy. Alembic provides version control for your database schema changes.

### **Initial Setup (Already Done)**

The migration environment is already configured. Here's what was set up:

```bash
# Alembic was initialized with:
uv run alembic init alembic

# Configuration files created:
├── alembic.ini              # Alembic configuration
├── alembic/
│   ├── env.py              # Migration environment (configured for our app)
│   ├── script.py.mako      # Migration template
│   └── versions/           # Migration files directory
│       └── 92831e959bbb_initial_migration_create_user_project_.py
```

### **Current Database Schema**

The initial migration (ID: `92831e959bbb`) creates:

1. **`users` table**: Authentication and user management
   - `id`, `email`, `name`, `hashed_password`
   - `is_active`, `is_superuser`
   - `created_at`, `updated_at`

2. **`projects` table**: Assessment projects
   - `id`, `name`, `description`, `owner_id`
   - Foreign key to `users.id`
   - `created_at`, `updated_at`

3. **`assessments` table**: SGLGB leadership assessments
   - `id`, `project_id`, `user_id`, `title`, `description`
   - Assessment status enum: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `REVIEWED`
   - Video metadata: `video_filename`, `video_url`, `video_duration`
   - SGLGB scores: `score_strong`, `score_gallant`, `score_loyal`, `score_guiding`, `score_bold`
   - Analysis data: `analysis_data`, `recommendations` (JSON fields)
   - Timestamps: `processing_started_at`, `processing_completed_at`, `created_at`, `updated_at`

### **Common Migration Commands**

#### **Check Migration Status**
```bash
# Show current migration revision
uv run alembic current

# Show migration history
uv run alembic history --verbose

# Show pending migrations
uv run alembic show head
```

#### **Apply Migrations**
```bash
# Apply all pending migrations (recommended)
uv run alembic upgrade head

# Apply specific migration
uv run alembic upgrade <revision_id>

# Apply next migration only
uv run alembic upgrade +1
```

#### **Create New Migrations**
```bash
# Auto-generate migration from model changes (recommended)
uv run alembic revision --autogenerate -m "Add new field to user table"

# Create empty migration file (for data-only changes)
uv run alembic revision -m "Add default admin user"

# Create migration in specific directory (if using branches)
uv run alembic revision --autogenerate -m "Description" --head=head
```

#### **Rollback Migrations**
```bash
# Rollback one migration
uv run alembic downgrade -1

# Rollback to specific revision
uv run alembic downgrade <revision_id>

# Reset database completely (⚠️ DESTRUCTIVE)
uv run alembic downgrade base
```

### **Migration Workflow**

#### **1. Making Model Changes**
```python
# Example: Add a new field to User model
# In app/db/models/user.py

class User(Base):
    # ... existing fields ...
    phone_number = Column(String, nullable=True)  # New field
```

#### **2. Generate Migration**
```bash
uv run alembic revision --autogenerate -m "Add phone number to user"
```

#### **3. Review Generated Migration**
Always review the generated migration file in `alembic/versions/` before applying:

```python
def upgrade() -> None:
    # Check these operations are correct
    op.add_column('users', sa.Column('phone_number', sa.String(), nullable=True))

def downgrade() -> None:
    # Check rollback operations
    op.drop_column('users', 'phone_number')
```

#### **4. Apply Migration**
```bash
uv run alembic upgrade head
```

### **Migration Best Practices**

#### **🔍 Always Review Migrations**
- Check generated SQL before applying
- Ensure backward compatibility
- Test rollback procedures

#### **📝 Migration Naming**
```bash
# Good examples:
uv run alembic revision --autogenerate -m "Add user preferences table"
uv run alembic revision --autogenerate -m "Add index to email field"
uv run alembic revision --autogenerate -m "Remove deprecated status field"

# Bad examples:
uv run alembic revision --autogenerate -m "Update"
uv run alembic revision --autogenerate -m "Fix"
```

#### **🔒 Production Safety**
```bash
# Always backup before production migrations
# Test migrations on staging first
# Consider maintenance windows for large changes

# For production, prefer:
uv run alembic upgrade head
```

#### **🔄 Data Migrations**
For data-only changes, create empty migrations:

```python
def upgrade() -> None:
    """Add default admin user."""
    # Use raw SQL or SQLAlchemy operations
    connection = op.get_bind()
    connection.execute(text("""
        INSERT INTO users (id, email, name, hashed_password, is_superuser)
        VALUES ('admin-001', 'admin@sinag.dilg.gov.ph', 'Admin', 'hashed_password', true)
    """))

def downgrade() -> None:
    """Remove default admin user."""
    connection = op.get_bind()
    connection.execute(text("DELETE FROM users WHERE email = 'admin@sinag.dilg.gov.ph'"))
```

### **Troubleshooting**

#### **Common Issues**

**Migration Not Detected:**
```bash
# Ensure model is imported in alembic/env.py
# Check that Base.metadata includes your model

# Force detection:
uv run alembic revision --autogenerate -m "Force detection" --head=head
```

**Database Connection Issues:**
```bash
# Verify DATABASE_URL in .env file
# Check Supabase connection string format

# Test connection:
uv run python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

**Migration Conflicts:**
```bash
# If multiple developers create migrations simultaneously
uv run alembic merge -m "Merge migrations" <rev1> <rev2>
```

#### **Recovery Commands**
```bash
# If migration state is inconsistent
uv run alembic stamp head  # Mark as current without running

# Force revision (dangerous)
uv run alembic stamp <revision_id>
```

### **Database Connection Configuration**

The migration system is configured to use your Supabase database:

```python
# In alembic/env.py - automatically configured
from app.core.config import settings
from app.db.base import Base

# Database URL is loaded from settings
if settings.DATABASE_URL:
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# All models are imported for autogeneration
target_metadata = Base.metadata
```

## 🧪 **Testing**

This project includes a comprehensive testing setup using **pytest** with FastAPI integration. Testing is essential for maintaining code quality with a 2-person team.

### **Quick Testing Commands**

```bash
# Run all tests (recommended)
make test

# Run tests with coverage report
make test-cov

# Run specific test file
uv run pytest tests/test_health.py -v

# Run tests matching a pattern
uv run pytest -k "health" -v

# Run tests with detailed output
uv run pytest -v --tb=long
```

### **Test Structure**

```
tests/
├── conftest.py          # Shared test fixtures and configuration
├── test_health.py       # Health check and basic endpoint tests
├── test_auth.py         # Authentication tests (planned)
├── test_users.py        # User management tests (planned)
├── test_projects.py     # Project CRUD tests (planned)
└── test_assessments.py  # Assessment logic tests (planned)
```

### **Test Configuration**

The testing setup includes:

- **Test Database**: SQLite in-memory database for fast, isolated tests
- **Test Client**: FastAPI TestClient with dependency overrides
- **Fixtures**: Reusable test data and setup in `conftest.py`
- **Coverage**: HTML coverage reports in `htmlcov/` directory

### **Running Tests**

#### **Basic Test Execution**
```bash
# Run all tests
make test
# OR
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific test file
uv run pytest tests/test_health.py

# Run specific test function
uv run pytest tests/test_health.py::test_health_endpoint
```

#### **Coverage Reports**
```bash
# Run tests with coverage
make test-cov
# OR
uv run pytest --cov=app --cov-report=term-missing --cov-report=html

# View HTML coverage report
# Open htmlcov/index.html in your browser
```

#### **Test Filtering**
```bash
# Run tests matching pattern
uv run pytest -k "health"

# Run tests with specific marker (when implemented)
uv run pytest -m "integration"

# Run failed tests from last run
uv run pytest --lf
```

### **Writing Tests**

#### **Basic Test Example**
```python
# tests/test_example.py
def test_example_endpoint(client):
    """Test example endpoint returns expected response."""
    response = client.get("/api/v1/example")
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
```

#### **Database Test Example**
```python
# tests/test_users.py
def test_create_user(client, db_session, sample_user_data):
    """Test user creation endpoint."""
    response = client.post("/api/v1/users/", json=sample_user_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == sample_user_data["email"]
    assert "id" in data
```

#### **Authentication Test Example**
```python
# tests/test_auth.py
def test_login_success(client, sample_user_data):
    """Test successful user login."""
    # First create user
    client.post("/api/v1/auth/register", json=sample_user_data)
    
    # Then login
    login_data = {
        "email": sample_user_data["email"],
        "password": sample_user_data["password"]
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
```

### **Available Fixtures**

The `conftest.py` provides these fixtures:

#### **`client`** - FastAPI Test Client
```python
def test_example(client):
    response = client.get("/health")
    assert response.status_code == 200
```

#### **`db_session`** - Database Session
```python
def test_database_operation(db_session):
    from app.db.models.user import User
    
    user = User(email="test@example.com", name="Test User")
    db_session.add(user)
    db_session.commit()
    
    assert user.id is not None
```

#### **`sample_user_data`** - Test User Data
```python
def test_user_creation(client, sample_user_data):
    response = client.post("/api/v1/users/", json=sample_user_data)
    assert response.status_code == 201
```

### **Testing Best Practices**

#### **✅ DO**
- Write tests for all new endpoints
- Test both success and error cases
- Use descriptive test names
- Keep tests independent and isolated
- Test business logic in services separately
- Use fixtures for common test data
- Run tests before committing code

#### **❌ DON'T**
- Don't test third-party library code
- Don't write tests that depend on external services
- Don't use production database for tests
- Don't write tests that depend on test execution order
- Don't ignore failing tests

### **Test Categories**

#### **Unit Tests**
Test individual functions and methods in isolation:
```python
# Test service logic
def test_calculate_sglgb_score():
    from app.services.assessment_service import calculate_sglgb_score
    
    result = calculate_sglgb_score(assessment_data)
    assert result.total_score > 0
```

#### **Integration Tests**
Test API endpoints with database interactions:
```python
# Test full endpoint workflow
def test_complete_assessment_workflow(client, auth_headers):
    # Create project
    project_response = client.post("/api/v1/projects/", json=project_data, headers=auth_headers)
    project_id = project_response.json()["id"]
    
    # Create assessment
    assessment_data = {"project_id": project_id, "title": "Test Assessment"}
    response = client.post("/api/v1/assessments/", json=assessment_data, headers=auth_headers)
    
    assert response.status_code == 201
```

#### **Authentication Tests**
Test security and access control:
```python
def test_protected_endpoint_requires_auth(client):
    """Test that protected endpoints require authentication."""
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
```

### **Test Data Management**

#### **Factory Pattern** (Future Enhancement)
When using `factory-boy` for test data generation:
```python
# tests/factories.py
import factory
from app.db.models.user import User

class UserFactory(factory.Factory):
    class Meta:
        model = User
    
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Faker("name")
    is_active = True
```

### **Continuous Testing**

#### **Pre-commit Testing**
```bash
# Add to your development workflow
make lint && make test
```

#### **Watch Mode** (Optional)
```bash
# Install pytest-watch for continuous testing
uv add --dev pytest-watch

# Run tests in watch mode
uv run ptw tests/
```

### **Debugging Tests**

#### **Debugging Failed Tests**
```bash
# Run with detailed output
uv run pytest tests/test_failing.py -v --tb=long

# Drop into debugger on failure
uv run pytest tests/test_failing.py --pdb

# Print statements (use capfd fixture to capture)
def test_with_output(client, capfd):
    print("Debug information")
    response = client.get("/health")
    captured = capfd.readouterr()
    print(f"Captured output: {captured.out}")
```

#### **Test Database Inspection**
```python
def test_database_state(db_session):
    """Check database state during test."""
    from app.db.models.user import User
    
    # Query test database
    users = db_session.query(User).all()
    print(f"Users in test DB: {len(users)}")
```

### **Performance Testing**

#### **Response Time Testing**
```python
import time

def test_endpoint_performance(client):
    """Test endpoint responds within acceptable time."""
    start_time = time.time()
    response = client.get("/api/v1/projects/")
    duration = time.time() - start_time
    
    assert response.status_code == 200
    assert duration < 1.0  # Should respond within 1 second
```

### **Mocking External Services**

```python
from unittest.mock import patch

def test_external_service_call(client):
    """Test handling of external service calls."""
    with patch('app.services.external_service.call_api') as mock_call:
        mock_call.return_value = {"status": "success"}
        
        response = client.post("/api/v1/process/")
        assert response.status_code == 200
        mock_call.assert_called_once()
```

### **Test Environment**

The test environment is automatically configured with:

- **Isolated database**: SQLite in-memory, created fresh for each test session
- **Override dependencies**: Database and authentication dependencies are mocked
- **Environment variables**: Test-specific settings loaded automatically
- **Cleanup**: Database and temporary files cleaned up after tests

### **Troubleshooting Tests**

#### **Common Issues**

**Import Errors:**
```bash
# Ensure Python path is correct
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
uv run pytest
```

**Database Connection Issues:**
```bash
# Check test database configuration
uv run python -c "from tests.conftest import SQLALCHEMY_DATABASE_URL; print(SQLALCHEMY_DATABASE_URL)"
```

**Fixture Not Found:**
```bash
# Ensure conftest.py is in tests/ directory
# Check fixture names match function parameters
```

**Tests Running Slowly:**
```bash
# Use SQLite for faster tests (already configured)
# Consider parallel testing for large test suites:
uv add --dev pytest-xdist
uv run pytest -n auto
```

### **Manual Endpoint Testing**

For manual verification or QA, you can use the interactive API docs, `curl`, or a helper script.

#### **Interactive API Documentation**
1. Start the server: `uv run uvicorn main:app --reload`
2. Visit: http://localhost:8000/docs
3. Test endpoints directly in the Swagger UI

#### **curl Commands**
```bash
# Test login (will fail with 401 for invalid credentials)
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass"}'

# Test change password (will fail with 401 without token)
curl -X POST "http://localhost:8000/api/v1/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"current_password": "old", "new_password": "new"}'
```

#### **Create a Test User**
You can use the following Python script to create a user directly in the database for testing. Run it within the `uv` environment.

```python
# Run this in a Python shell: `uv run python`
from app.db.base import SessionLocal
from app.db.models.user import User
from app.core.security import get_password_hash
import uuid

db = SessionLocal()
user = User(
    id=str(uuid.uuid4()),
    email="test@example.com",
    name="Test User",
    hashed_password=get_password_hash("testpass123"),
    role="BLGU User",
    is_active=True,
    must_change_password=True
)
db.add(user)
db.commit()
print(f"Created user: {user.email}")
db.close()
```

## 📝 **Code Style**

- **Linting**: `ruff` (configured in `pyproject.toml`)
- **Formatting**: `ruff format`
- **Type Checking**: `mypy`
- **Import Sorting**: Handled by `ruff`

## 🚀 **Deployment Notes**

*To be documented when deployment pipeline is implemented*

## 🔗 **Related Documentation**

- [Root README](../../README.md) - Overall project setup
- [Web App README](../web/README.md) - Frontend documentation
- [Architecture Docs](../../docs/architecture.md) - System design
- [Decision Records](../../docs/decisions.md) - Technical decisions
