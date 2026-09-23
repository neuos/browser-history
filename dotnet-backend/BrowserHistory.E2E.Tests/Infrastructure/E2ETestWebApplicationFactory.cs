using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using BrowserHistory.Infrastructure.Data;
using BrowserHistory.Infrastructure.Identity;

namespace BrowserHistory.E2E.Tests.Infrastructure;

/// <summary>
/// Custom WebApplicationFactory for end-to-end testing with in-memory SQLite database.
///
/// A plain ":memory:" SQLite connection string gives every new SqliteConnection its own fresh,
/// empty database - each request resolves its own DbContext, opens its own connection, and finds
/// no tables. Routing every DbContext through one shared, already-open SqliteConnection object
/// fixes that, but SQLite doesn't support concurrent command execution on a single connection
/// object from multiple requests at once, so it 400s/500s under real concurrency.
///
/// The fix is SQLite's shared-cache mode (`mode=memory&cache=shared`) with a unique db name per
/// factory instance: each request still gets its own ordinary SqliteConnection (so concurrent
/// requests don't contend on one connection object), but every connection using that same name
/// sees the same in-memory database. The "anchor" connections below are opened once and held for
/// the factory's lifetime purely to keep the shared in-memory database alive between requests -
/// SQLite drops a shared-cache `:memory:` database once its last connection closes.
/// </summary>
public class E2ETestWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _mainConnectionString = $"Data Source=file:e2e-main-{Guid.NewGuid():N}?mode=memory&cache=shared";
    private readonly string _identityConnectionString = $"Data Source=file:e2e-identity-{Guid.NewGuid():N}?mode=memory&cache=shared";
    private readonly SqliteConnection _mainAnchor;
    private readonly SqliteConnection _identityAnchor;

    public E2ETestWebApplicationFactory()
    {
        _mainAnchor = new SqliteConnection(_mainConnectionString);
        _identityAnchor = new SqliteConnection(_identityConnectionString);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registrations
            RemoveDbContextRegistrations(services);

            // Add test-specific DbContexts pointed at the shared-cache in-memory databases
            services.AddDbContext<BrowserHistoryDbContext>(options =>
            {
                options.UseSqlite(_mainConnectionString);
                options.EnableServiceProviderCaching(false);
                options.EnableSensitiveDataLogging();
            });

            services.AddDbContext<DeviceIdentityContext>(options =>
            {
                options.UseSqlite(_identityConnectionString);
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
        await _mainAnchor.OpenAsync();
        await _identityAnchor.OpenAsync();

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
        await _mainAnchor.DisposeAsync();
        await _identityAnchor.DisposeAsync();
    }

    /// <summary>
    /// Clears all rows from the main database's tables. Test methods within the same test class
    /// share one persistent in-memory database (see class remarks), so tests that assert on
    /// exact row counts should call this first.
    /// </summary>
    public async Task ClearTestDataAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();

        context.SyncEvents.RemoveRange(context.SyncEvents);
        context.Devices.RemoveRange(context.Devices);

        await context.SaveChangesAsync();
    }
}
