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
        services.AddScoped<IHistoryRepository, HistoryRepository>();
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
        
        // Initialize main database
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        await context.Database.EnsureCreatedAsync();
        if ((await context.Database.GetPendingMigrationsAsync()).Any())
        {
            await context.Database.MigrateAsync();
        }

        // Initialize identity database
        var identityContext = scope.ServiceProvider.GetRequiredService<DeviceIdentityContext>();
        await identityContext.Database.EnsureCreatedAsync();
        if ((await identityContext.Database.GetPendingMigrationsAsync()).Any())
        {
            await identityContext.Database.MigrateAsync();
        }
    }
}
