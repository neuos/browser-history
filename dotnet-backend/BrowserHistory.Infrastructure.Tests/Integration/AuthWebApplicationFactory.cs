using BrowserHistory.Infrastructure.Data;
using BrowserHistory.Infrastructure.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;

namespace BrowserHistory.Infrastructure.Tests.Integration;

public class AuthWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        
        builder.ConfigureServices(services =>
        {
            // Remove all Entity Framework related services to avoid provider conflicts
            var dbRelatedDescriptors = services
                .Where(descriptor => 
                    // Remove DbContext registrations
                    descriptor.ServiceType == typeof(DbContextOptions<BrowserHistoryDbContext>) ||
                    descriptor.ServiceType == typeof(DbContextOptions<DeviceIdentityContext>) ||
                    descriptor.ServiceType == typeof(BrowserHistoryDbContext) ||
                    descriptor.ServiceType == typeof(DeviceIdentityContext) ||
                    // Remove all DbContextOptions and related generic services
                    descriptor.ServiceType.IsGenericType && descriptor.ServiceType.GetGenericTypeDefinition() == typeof(DbContextOptions<>) ||
                    // Remove Entity Framework services
                    descriptor.ServiceType.FullName?.Contains("EntityFramework") == true ||
                    descriptor.ServiceType.FullName?.Contains("Microsoft.EntityFrameworkCore") == true)
                .ToList();

            foreach (var descriptor in dbRelatedDescriptors)
            {
                services.Remove(descriptor);
            }

            // Add fresh in-memory database contexts
            services.AddDbContext<BrowserHistoryDbContext>(options =>
            {
                options.UseInMemoryDatabase("TestDb_App_" + Guid.NewGuid());
                options.EnableSensitiveDataLogging();
            });
                
            services.AddDbContext<DeviceIdentityContext>(options =>
            {
                options.UseInMemoryDatabase("TestDb_Identity_" + Guid.NewGuid());
                options.EnableSensitiveDataLogging();
            });
        });
    }
}
