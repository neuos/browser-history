# Use the official .NET 9 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

# Set the working directory
WORKDIR /app

# Copy only the 4 projects the API actually depends on - not BrowserHistory.sln, which also
# references 4 test projects this image has no reason to build.
COPY BrowserHistory.Domain/BrowserHistory.Domain.csproj ./BrowserHistory.Domain/
COPY BrowserHistory.Application/BrowserHistory.Application.csproj ./BrowserHistory.Application/
COPY BrowserHistory.Infrastructure/BrowserHistory.Infrastructure.csproj ./BrowserHistory.Infrastructure/
COPY BrowserHistory.Api/BrowserHistory.Api.csproj ./BrowserHistory.Api/

# Restore dependencies
RUN dotnet restore BrowserHistory.Api/BrowserHistory.Api.csproj

# Copy the entire source code
COPY . .

# Build the application in Release mode
RUN dotnet build BrowserHistory.Api/BrowserHistory.Api.csproj -c Release --no-restore

# Publish the application (framework-dependent, JIT - NOT Native AOT). The API's JSON
# serialization relies on reflection (BrowserHistory.Api.csproj no longer disables it) because
# ApiJsonContext, the source-gen context meant to replace reflection under AOT, is missing several
# DTOs used by real endpoints and references at least one from the wrong namespace - publishing
# with PublishAot=true here reproduces the exact "every JSON endpoint throws on first request" bug
# fixed in this repo's history. Revisit together if ApiJsonContext is ever finished.
FROM build AS publish
RUN dotnet publish BrowserHistory.Api/BrowserHistory.Api.csproj \
    -c Release \
    --no-restore \
    -o /app/publish

# Use a minimal runtime image for the final stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime

# curl for the HEALTHCHECK below; icu-libs for globalization/culture-aware string operations
RUN apk add --no-cache \
    curl \
    icu-libs

# Create a non-root user
RUN addgroup -g 1001 appuser && \
    adduser -u 1001 -G appuser -s /bin/sh -D appuser

# Set the working directory
WORKDIR /app

# Copy the published application
COPY --from=publish /app/publish .

# Create directories for data and logs
RUN mkdir -p /app/data /app/logs && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 8080

# Configure environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_RUNNING_IN_CONTAINER=true

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application via `dotnet <dll>`, not the generated apphost (./BrowserHistory.Api):
# the apphost is glibc-linked, but this runtime image is Alpine (musl) - executing it directly
# fails with a misleading "no such file or directory" (the ELF interpreter it was linked against
# doesn't exist on this libc, which the kernel reports as ENOENT rather than a linker error).
ENTRYPOINT ["dotnet", "BrowserHistory.Api.dll"]
