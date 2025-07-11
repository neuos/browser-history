# 🚀 Browser History Backend - C# .NET 9 Implementation Plan

## 📋 **Project Overview**
Rewrite the current Deno/TypeScript backend in C# .NET 9 using Clean Architecture, CQRS, and modern .NET practices with Native AOT support.

---

## 🏗️ **Architecture & Technology Stack**

### **Core Technologies**
- [ ] .NET 9 with Minimal APIs
- [ ] Native AOT compilation support
- [ ] Clean Architecture + CQRS with MediatR
- [ ] Entity Framework Core 9 with SQLite
- [ ] ASP.NET Core Identity for authentication
- [ ] Server-Sent Events (SSE) for real-time sync
- [ ] FluentValidation for input validation
- [ ] Serilog for structured logging

### **Testing Technologies**
- [ ] xUnit for unit/integration testing
- [ ] FsCheck for property-based testing
- [ ] FluentAssertions for readable assertions
- [ ] Object Mother pattern for test data
- [ ] Real SQLite database for integration tests

---

## 📁 **Project Structure Setup**

### **Solution Structure**
- [ ] Create solution file `BrowserHistory.sln`
- [ ] Setup `.editorconfig` and `.gitignore`
- [ ] Configure Directory.Build.props for common settings

### **Core Projects**
- [ ] `BrowserHistory.Domain` - Domain entities, value objects, events
- [ ] `BrowserHistory.Application` - CQRS handlers, DTOs, services
- [ ] `BrowserHistory.Infrastructure` - Data access, external services
- [ ] `BrowserHistory.Shared` - Shared contracts and DTOs
- [ ] `BrowserHistory.Api` - Minimal APIs, middleware, configuration

### **Test Projects**
- [ ] `BrowserHistory.Domain.Tests` - Domain logic unit tests
- [ ] `BrowserHistory.Application.Tests` - Application service tests
- [ ] `BrowserHistory.Infrastructure.Tests` - Repository & service tests
- [ ] `BrowserHistory.Api.Tests` - API integration tests
- [ ] `BrowserHistory.E2E.Tests` - End-to-end workflow tests

---

## 🎯 **Domain Layer Implementation**

### **Core Entities**
- [ ] `Device.cs` - Root aggregate for device management
  - [ ] DeviceId (Guid)
  - [ ] DeviceName (string)
  - [ ] RegisteredAt (DateTime)
  - [ ] LastSeen (DateTime)
  - [ ] IsActive (bool)
- [ ] `SyncEvent.cs` - Sync event entity
  - [ ] Id (Guid)
  - [ ] DeviceId (Guid)
  - [ ] Timestamp (DateTime)
  - [ ] EventType (enum: Create, Update, Delete)
  - [ ] EntityType (enum: History, Page)
  - [ ] EntityId (string)
  - [ ] Data (JSON)
  - [ ] Checksum (string)
- [ ] `HistoryNode.cs` - Browser history entry
  - [ ] Id (Guid)
  - [ ] DeviceId (Guid)
  - [ ] Url (string)
  - [ ] TabId (int)
  - [ ] Timestamp (DateTime)
  - [ ] NavigationSourceId (Guid?)
  - [ ] CreatedAt (DateTime)
  - [ ] UpdatedAt (DateTime)
  - [ ] DeletedAt (DateTime?)
- [ ] `Page.cs` - Page metadata entity
  - [ ] Url (string) - Primary key
  - [ ] Title (string?)
  - [ ] Favicon (string?)
  - [ ] Metadata (JSON)
  - [ ] LastUpdate (DateTime)
  - [ ] CreatedAt (DateTime)
  - [ ] UpdatedAt (DateTime)
  - [ ] DeletedAt (DateTime?)

### **Value Objects**
- [ ] `DeviceId.cs` - Strong-typed device identifier
- [ ] `Url.cs` - URL validation and normalization
- [ ] `Checksum.cs` - Content checksum validation
- [ ] `Timestamp.cs` - UTC timestamp wrapper

### **Domain Events**
- [ ] `DeviceRegisteredEvent.cs`
- [ ] `SyncEventCreatedEvent.cs`
- [ ] `SyncEventProcessedEvent.cs`
- [ ] `HistoryNodeCreatedEvent.cs`
- [ ] `PageUpdatedEvent.cs`

### **Repository Interfaces**
- [ ] `IDeviceRepository.cs`
- [ ] `ISyncEventRepository.cs`
- [ ] `IHistoryRepository.cs`
- [ ] `IPageRepository.cs`

### **Domain Exceptions**
- [ ] `DomainException.cs`
- [ ] `DeviceNotFoundException.cs`
- [ ] `InvalidSyncEventException.cs`

---

## 🔧 **Application Layer Implementation**

### **Common Infrastructure**
- [ ] `ICurrentUserService.cs` - Current device context
- [ ] `IEventBus.cs` - In-memory domain event bus
- [ ] `INotificationService.cs` - SSE notification abstraction
- [ ] `ISyncOrchestrator.cs` - Sync business logic coordination

### **MediatR Behaviors**
- [ ] `ValidationBehavior.cs` - FluentValidation pipeline
- [ ] `LoggingBehavior.cs` - Request/response logging
- [ ] `PerformanceBehavior.cs` - Performance monitoring
- [ ] `ExceptionHandlingBehavior.cs` - Centralized exception handling

### **Auth Feature**
- [ ] Commands:
  - [ ] `RegisterDeviceCommand` & Handler & Validator
  - [ ] `RefreshTokenCommand` & Handler & Validator
- [ ] Queries:
  - [ ] `ValidateTokenQuery` & Handler
  - [ ] `GetDeviceInfoQuery` & Handler
- [ ] DTOs:
  - [ ] `RegisterDeviceRequest/Response`
  - [ ] `RefreshTokenRequest/Response`
  - [ ] `DeviceInfoDto`

### **Sync Feature**
- [ ] Commands:
  - [ ] `SubmitSyncEventsCommand` & Handler & Validator
  - [ ] `ProcessSyncEventCommand` & Handler & Validator
- [ ] Queries:
  - [ ] `GetSyncEventsQuery` & Handler
  - [ ] `GetSyncStatusQuery` & Handler
- [ ] DTOs:
  - [ ] `SyncEventDto`
  - [ ] `SubmitSyncEventsRequest/Response`
  - [ ] `SyncStatusDto`

### **History Feature**
- [ ] Queries:
  - [ ] `GetHistoryEntriesQuery` & Handler
  - [ ] `SearchHistoryQuery` & Handler
- [ ] DTOs:
  - [ ] `HistoryEntryDto`
  - [ ] `GetHistoryRequest/Response`
  - [ ] `PagedResult<T>`

### **Device Feature**
- [ ] Queries:
  - [ ] `GetDevicesQuery` & Handler
  - [ ] `GetDeviceStatusQuery` & Handler
- [ ] DTOs:
  - [ ] `DeviceDto`
  - [ ] `DeviceStatusDto`

---

## 🗄️ **Infrastructure Layer Implementation**

### **Data Access**
- [ ] `BrowserHistoryContext.cs` - Main EF DbContext
- [ ] Entity Configurations:
  - [ ] `DeviceConfiguration.cs`
  - [ ] `SyncEventConfiguration.cs`
  - [ ] `HistoryNodeConfiguration.cs`
  - [ ] `PageConfiguration.cs`
- [ ] Repository Implementations:
  - [ ] `DeviceRepository.cs`
  - [ ] `SyncEventRepository.cs`
  - [ ] `HistoryRepository.cs`
  - [ ] `PageRepository.cs`
- [ ] Database Migrations:
  - [ ] Initial migration
  - [ ] Seed data for development

### **Identity & Authentication**
- [ ] `DeviceUser.cs` - Custom Identity user for devices
- [ ] `DeviceIdentityContext.cs` - Identity DbContext
- [ ] `JwtTokenService.cs` - JWT token generation/validation
- [ ] `IdentityConfiguration.cs` - Identity setup

### **Services**
- [ ] `ServerSentEventService.cs` - SSE implementation
- [ ] `EventBus.cs` - In-memory domain event bus
- [ ] `BackgroundSyncService.cs` - Background processing
- [ ] `SyncOrchestrator.cs` - Sync business logic

### **Configuration**
- [ ] `ServiceCollectionExtensions.cs` - DI container setup
- [ ] `DatabaseConfiguration.cs` - EF configuration
- [ ] `AuthenticationConfiguration.cs` - Auth setup

---

## 🌐 **API Layer Implementation**

### **Minimal API Endpoints**
- [ ] `AuthEndpoints.cs`:
  - [ ] `POST /api/v1/auth/register-device`
  - [ ] `POST /api/v1/auth/refresh-token`
- [ ] `SyncEndpoints.cs`:
  - [ ] `GET /api/v1/sync/events`
  - [ ] `POST /api/v1/sync/events`
  - [ ] `GET /api/v1/sync/state/{deviceId}`
- [ ] `HistoryEndpoints.cs`:
  - [ ] `GET /api/v1/history`
  - [ ] `GET /api/v1/history/search`
- [ ] `DeviceEndpoints.cs`:
  - [ ] `GET /api/v1/devices`
  - [ ] `GET /api/v1/devices/{deviceId}`
- [ ] `HealthEndpoints.cs`:
  - [ ] `GET /health`
  - [ ] `GET /health/ready`

### **Server-Sent Events**
- [ ] `GET /api/v1/sse/events` - SSE endpoint with authentication

### **Middleware**
- [ ] `ExceptionHandlingMiddleware.cs` - Global exception handling
- [ ] `RequestLoggingMiddleware.cs` - Structured request logging
- [ ] `CorrelationIdMiddleware.cs` - Request correlation tracking

### **Extensions & Configuration**
- [ ] `WebApplicationExtensions.cs` - Pipeline configuration
- [ ] `EndpointExtensions.cs` - Common endpoint helpers
- [ ] `Program.cs` - Application entry point
- [ ] `appsettings.json` / `appsettings.Development.json`

---

## 🧪 **Testing Implementation**

### **Domain Tests**
- [ ] Entity Tests:
  - [ ] `DeviceTests.cs`
  - [ ] `SyncEventTests.cs`
  - [ ] `HistoryNodeTests.cs`
  - [ ] `PageTests.cs`
- [ ] Value Object Tests:
  - [ ] `DeviceIdTests.cs`
  - [ ] `UrlTests.cs`
  - [ ] `ChecksumTests.cs`
- [ ] Object Mothers:
  - [ ] `DeviceMother.cs`
  - [ ] `SyncEventMother.cs`
  - [ ] `HistoryNodeMother.cs`

### **Application Tests**
- [ ] Command Handler Tests:
  - [ ] `RegisterDeviceHandlerTests.cs`
  - [ ] `SubmitSyncEventsHandlerTests.cs`
- [ ] Query Handler Tests:
  - [ ] `GetSyncEventsHandlerTests.cs`
  - [ ] `GetHistoryEntriesHandlerTests.cs`
- [ ] Behavior Tests:
  - [ ] `ValidationBehaviorTests.cs`
  - [ ] `LoggingBehaviorTests.cs`

### **Infrastructure Tests**
- [ ] Repository Tests:
  - [ ] `DeviceRepositoryTests.cs`
  - [ ] `SyncEventRepositoryTests.cs`
- [ ] Service Tests:
  - [ ] `ServerSentEventServiceTests.cs`
  - [ ] `JwtTokenServiceTests.cs`
- [ ] Test Database Setup:
  - [ ] `TestDatabaseFactory.cs`
  - [ ] `DatabaseFixture.cs`

### **API Integration Tests**
- [ ] Endpoint Tests:
  - [ ] `AuthEndpointsTests.cs`
  - [ ] `SyncEndpointsTests.cs`
  - [ ] `HistoryEndpointsTests.cs`
- [ ] Authentication Tests:
  - [ ] `JwtAuthenticationTests.cs`
- [ ] Test Fixtures:
  - [ ] `ApiTestFixture.cs`
  - [ ] `TestWebApplicationFactory.cs`

### **Property-Based Tests (FsCheck)**
- [ ] `SyncEventProperties.cs` - Sync event invariants
- [ ] `DeviceProperties.cs` - Device state properties
- [ ] `HistoryProperties.cs` - History data integrity

### **E2E Tests**
- [ ] `SyncWorkflowTests.cs` - Multi-device sync scenarios
- [ ] `AuthenticationFlowTests.cs` - Complete auth flows
- [ ] `DataConsistencyTests.cs` - Cross-device data integrity

---

## 📊 **Database & Performance**

### **Database Setup**
- [ ] SQLite database configuration
- [ ] Connection string management
- [ ] Database initialization strategy
- [ ] Development seed data

### **Optimizations**
- [ ] Indexes for sync operations:
  - [ ] `IX_SyncEvents_DeviceId_Timestamp`
  - [ ] `IX_SyncEvents_Timestamp_ExcludeDevice`
  - [ ] `IX_HistoryNodes_DeviceId_Timestamp`
- [ ] Compiled queries for frequent operations
- [ ] Bulk operations for sync events
- [ ] Connection pooling configuration

### **Migrations**
- [ ] Initial schema migration
- [ ] Data seeding migration
- [ ] Index creation migrations

---

## 🔐 **Security & Authentication**

### **ASP.NET Core Identity**
- [ ] Custom DeviceUser implementation
- [ ] Shared secret validation
- [ ] JWT token configuration
- [ ] Token refresh mechanism
- [ ] Device fingerprinting (optional)

### **API Security**
- [ ] JWT authentication middleware
- [ ] Authorization policies
- [ ] CORS configuration
- [ ] Request size limits
- [ ] Security headers

---

## 📝 **Documentation & API**

### **API Documentation**
- [ ] OpenAPI/Swagger configuration
- [ ] API versioning setup
- [ ] Endpoint documentation
- [ ] Response schema definitions
- [ ] Authentication flow documentation

### **Code Documentation**
- [ ] XML documentation comments
- [ ] README.md with setup instructions
- [ ] Architecture decision records (ADRs)
- [ ] API usage examples

---

## 🚀 **Deployment & DevOps**

### **Native AOT Configuration**
- [ ] Native AOT-compatible serialization
- [ ] Source generators for reflection
- [ ] Trimming annotations
- [ ] AOT-compatible dependencies

### **Docker Support**
- [ ] Multi-stage Dockerfile
- [ ] Docker Compose for development
- [ ] Container optimization
- [ ] Health check configuration

### **Configuration Management**
- [ ] appsettings.json structure
- [ ] Environment-specific configurations
- [ ] Configuration validation
- [ ] Sensitive data handling

### **Logging & Monitoring**
- [ ] Serilog configuration
- [ ] Structured logging setup
- [ ] Correlation ID tracking
- [ ] Performance metrics
- [ ] Health check endpoints

---

## 🔄 **Migration & Compatibility**

### **API Compatibility**
- [ ] Analyze current API breaking changes
- [ ] Implement backward-compatible endpoints
- [ ] API versioning strategy
- [ ] Deprecation notices

### **Data Migration** (Future)
- [ ] Design migration strategy from Deno backend
- [ ] Data export/import utilities
- [ ] Schema comparison tools

---

## ✅ **Quality Assurance**

### **Code Quality**
- [ ] EditorConfig setup
- [ ] Code style enforcement
- [ ] Static analysis configuration
- [ ] Performance benchmarks

### **Testing Coverage**
- [ ] Achieve 90%+ unit test coverage
- [ ] Integration test coverage
- [ ] Property-based test coverage
- [ ] E2E test scenarios

### **Performance Testing**
- [ ] Benchmark.NET setup
- [ ] API performance tests
- [ ] Database query optimization
- [ ] Memory usage analysis

---

## 📅 **Implementation Timeline**

### **Phase 1: Foundation (Week 1)**
- [ ] Project structure setup
- [ ] Domain layer implementation
- [ ] Basic unit tests

### **Phase 2: Core Features (Week 2)**
- [ ] Application layer with CQRS
- [ ] Infrastructure layer with EF Core
- [ ] Authentication implementation

### **Phase 3: API Layer (Week 3)**
- [ ] Minimal APIs implementation
- [ ] Server-Sent Events
- [ ] Integration tests

### **Phase 4: Testing & Polish (Week 4)**
- [ ] Comprehensive test suite
- [ ] Property-based tests
- [ ] Performance optimization
- [ ] Documentation

### **Phase 5: Deployment Ready (Week 5)**
- [ ] Native AOT configuration
- [ ] Docker setup
- [ ] Production configuration
- [ ] E2E testing

---

## 🎯 **Success Criteria**

- [ ] **Functional Parity**: All current backend functionality replicated
- [ ] **Performance**: Native AOT compilation working
- [ ] **Testing**: 90%+ code coverage with comprehensive test suite
- [ ] **Documentation**: Complete API documentation and setup guides
- [ ] **Quality**: Clean Architecture principles followed
- [ ] **Compatibility**: Seamless frontend integration
- [ ] **Deployment**: Production-ready Docker configuration

---

## 📞 **Next Steps**

1. ✅ **Plan Review & Approval** - Current step
2. **Project Structure Setup** - Create solution and project files
3. **Domain Implementation** - Start with core entities and value objects
4. **Application Layer** - Implement CQRS patterns
5. **Infrastructure Setup** - Database and repositories
6. **API Development** - Minimal APIs and SSE
7. **Testing Implementation** - Comprehensive test suite
8. **Final Polish** - Performance, documentation, deployment

---

*This plan serves as a living document and will be updated as implementation progresses.*
