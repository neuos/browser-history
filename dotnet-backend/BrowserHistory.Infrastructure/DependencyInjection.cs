using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Infrastructure.Data;
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

        return services;
    }

    public static async Task InitializeDatabaseAsync(this IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BrowserHistoryDbContext>();
        
        // Ensure database is created
        await context.Database.EnsureCreatedAsync();
        
        // Apply any pending migrations
        if ((await context.Database.GetPendingMigrationsAsync()).Any())
        {
            await context.Database.MigrateAsync();
        }
    }
}
