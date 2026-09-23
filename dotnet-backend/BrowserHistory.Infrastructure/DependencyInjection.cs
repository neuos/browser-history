using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Infrastructure.Configuration;
using BrowserHistory.Infrastructure.Data;
using BrowserHistory.Infrastructure.Identity;
using BrowserHistory.Infrastructure.Repositories;
using BrowserHistory.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrowserHistory.Infrastructure;

/// <summary>
/// Extension methods for configuring Infrastructure layer services
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, 
        IConfiguration configuration)
    {
        // Database configuration
        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Data Source=browser-history.db";

        services.AddDbContext<BrowserHistoryDbContext>(options =>
        {
            options.UseSqlite(connectionString);
            
            // Enable sensitive data logging in development
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                options.EnableSensitiveDataLogging();
                options.EnableDetailedErrors();
            }
        });

        // Repository pattern
        services.AddScoped<IDeviceRepository, DeviceRepository>();
        services.AddScoped<ISyncEventRepository, SyncEventRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Services
        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddSingleton<IServerSentEventService, ServerSentEventService>();
        services.AddSingleton<ISSEConnectionManager>(provider => 
            provider.GetRequiredService<IServerSentEventService>() as ServerSentEventService 
            ?? throw new InvalidOperationException("ServerSentEventService must implement ISSEConnectionManager"));
        services.AddSingleton<ICacheService, CacheService>();

        // Configuration options
        services.Configure<CacheOptions>(configuration.GetSection(CacheOptions.SectionName));

        // Add HTTP context accessor for CurrentUserService
        services.AddHttpContextAccessor();

        // Authentication services
        services.AddAuthenticationServices(configuration);

        return services;
    }

    public static async Task InitializeDatabaseAsync(this IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();

        // MigrateAsync alone handles both "database doesn't exist yet" (creates it, including the
        // __EFMigrationsHistory table, then applies every migration in order) and "database exists
        // with pending migrations". EnsureCreatedAsync followed by a conditional MigrateAsync -
        // this method's previous implementation - doesn't: EnsureCreatedAsync builds the schema
        // straight from the current model with no migration bookkeeping, so a fresh database it
        // creates has all its tables already but zero rows in __EFMigrationsHistory, making every
        // migration look "pending" and MigrateAsync fail trying to re-run CREATE TABLE. This method
        // was also never actually called from Program.cs, so this bug had never run in practice.
        //
        // MigrateAsync is relational-only and throws against EF's InMemory provider (which
        // BrowserHistory.Infrastructure.Tests' AuthWebApplicationFactory swaps in, and which needs
        // no schema setup at all) - only migrate when the provider actually is relational.
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        if (context.Database.IsRelational())
        {
            await context.Database.MigrateAsync();
        }

        var identityContext = scope.ServiceProvider.GetRequiredService<DeviceIdentityContext>();
        if (identityContext.Database.IsRelational())
        {
            await identityContext.Database.MigrateAsync();
        }
    }
}
