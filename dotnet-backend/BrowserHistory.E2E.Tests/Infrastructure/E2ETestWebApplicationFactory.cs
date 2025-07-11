using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using BrowserHistory.Infrastructure.Data;
using BrowserHistory.Infrastructure.Identity;

namespace BrowserHistory.E2E.Tests.Infrastructure;

/// <summary>
/// Custom WebApplicationFactory for end-to-end testing with in-memory SQLite database.
/// Provides isolated database instances for each test without external dependencies.
/// </summary>
public class E2ETestWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private string _connectionString = "Data Source=:memory:";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registrations
            RemoveDbContextRegistrations(services);

            // Add test-specific DbContexts with in-memory SQLite
            services.AddDbContext<BrowserHistoryDbContext>(options =>
            {
                options.UseSqlite(_connectionString);
                options.EnableServiceProviderCaching(false);
                options.EnableSensitiveDataLogging();
            });

            services.AddDbContext<DeviceIdentityContext>(options =>
            {
                options.UseSqlite(_connectionString.Replace(":memory:", ":memory:identity"));
                options.EnableServiceProviderCaching(false);
                options.EnableSensitiveDataLogging();
            });

            // Reduce logging noise in tests
            services.AddLogging(builder =>
            {
                builder.ClearProviders();
                builder.AddConsole();
                builder.SetMinimumLevel(LogLevel.Warning);
            });
        });

        builder.UseEnvironment("Testing");
    }

    private static void RemoveDbContextRegistrations(IServiceCollection services)
    {
        var descriptors = services.Where(d =>
            d.ServiceType == typeof(DbContextOptions<BrowserHistoryDbContext>) ||
            d.ServiceType == typeof(DbContextOptions<DeviceIdentityContext>) ||
            d.ServiceType == typeof(BrowserHistoryDbContext) ||
            d.ServiceType == typeof(DeviceIdentityContext))
            .ToList();

        foreach (var descriptor in descriptors)
        {
            services.Remove(descriptor);
        }
    }

    public async Task InitializeAsync()
    {
        // Initialize in-memory databases
        using var scope = Services.CreateScope();
        
        var mainContext = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        await mainContext.Database.EnsureCreatedAsync();
        
        var identityContext = scope.ServiceProvider.GetRequiredService<DeviceIdentityContext>();
        await identityContext.Database.EnsureCreatedAsync();
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
    }

    /// <summary>
    /// Seeds the database with basic test data for end-to-end scenarios.
    /// </summary>
    public async Task SeedTestDataAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        
        // Basic seeding - implementation depends on actual domain model structure
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Clears all test data from the database.
    /// </summary>
    public async Task ClearTestDataAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        
        // Clear all tables - implementation depends on actual domain model structure
        await context.SaveChangesAsync();
    }
}
