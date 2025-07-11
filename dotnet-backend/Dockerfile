# Use the official .NET 9 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

# Set the working directory
WORKDIR /app

# Copy the solution file and project files
COPY BrowserHistory.sln ./
COPY BrowserHistory.Domain/BrowserHistory.Domain.csproj ./BrowserHistory.Domain/
COPY BrowserHistory.Application/BrowserHistory.Application.csproj ./BrowserHistory.Application/
COPY BrowserHistory.Infrastructure/BrowserHistory.Infrastructure.csproj ./BrowserHistory.Infrastructure/
COPY BrowserHistory.Api/BrowserHistory.Api.csproj ./BrowserHistory.Api/

# Restore dependencies
RUN dotnet restore

# Copy the entire source code
COPY . .

# Build the application in Release mode
RUN dotnet build -c Release --no-restore

# Publish the application with Native AOT
FROM build AS publish
RUN dotnet publish BrowserHistory.Api/BrowserHistory.Api.csproj \
    -c Release \
    --no-restore \
    --self-contained true \
    -o /app/publish \
    /p:PublishAot=true

# Use a minimal runtime image for the final stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime

# Install necessary runtime dependencies for Native AOT
RUN apk add --no-cache \
    icu-libs \
    libgcc \
    libstdc++

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

# Start the application
ENTRYPOINT ["./BrowserHistory.Api"]
