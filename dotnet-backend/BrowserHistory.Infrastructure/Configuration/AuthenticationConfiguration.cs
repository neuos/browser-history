using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Infrastructure.Identity;
using BrowserHistory.Infrastructure.Services;

namespace BrowserHistory.Infrastructure.Configuration;

/// <summary>
/// Configuration extensions for authentication setup.
/// </summary>
public static class AuthenticationConfiguration
{
    /// <summary>
    /// Adds ASP.NET Core Identity and JWT authentication services.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddAuthenticationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Add Identity DbContext
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        services.AddDbContext<DeviceIdentityContext>(options =>
            options.UseSqlite(connectionString, 
                b => b.MigrationsAssembly("BrowserHistory.Infrastructure")));

        // Add ASP.NET Core Identity
        services.AddIdentity<DeviceUser, IdentityRole<Guid>>(options =>
        {
            // Password settings - not used for devices, but required by Identity
            options.Password.RequireDigit = false;
            options.Password.RequireLowercase = false;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;
            options.Password.RequiredLength = 1;
            options.Password.RequiredUniqueChars = 0;

            // Lockout settings - disabled for devices
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
            options.Lockout.MaxFailedAccessAttempts = 999999;
            options.Lockout.AllowedForNewUsers = false;

            // User settings
            options.User.AllowedUserNameCharacters = 
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
            options.User.RequireUniqueEmail = false;
            
            // Sign-in settings
            options.SignIn.RequireConfirmedEmail = false;
            options.SignIn.RequireConfirmedPhoneNumber = false;
        })
        .AddEntityFrameworkStores<DeviceIdentityContext>()
        .AddDefaultTokenProviders();

        // Add JWT Authentication
        var jwtSecret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT Secret not configured");
        var jwtIssuer = configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("JWT Issuer not configured");
        var jwtAudience = configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("JWT Audience not configured");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecret)),
                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,
                ValidateAudience = true,
                ValidAudience = jwtAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RequireExpirationTime = true
            };

            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    // Update last seen when token is validated
                    var authService = context.HttpContext.RequestServices
                        .GetRequiredService<IAuthService>();
                    
                    var deviceIdClaim = context.Principal?.FindFirst("deviceId")?.Value;
                    if (deviceIdClaim != null && Guid.TryParse(deviceIdClaim, out var deviceGuid))
                    {
                        var deviceId = Domain.ValueObjects.DeviceId.From(deviceGuid);
                        await authService.UpdateLastSeenAsync(deviceId);
                    }
                },
                OnAuthenticationFailed = context =>
                {
                    // Log authentication failures if needed
                    return Task.CompletedTask;
                }
            };
        });

        // Add authorization
        services.AddAuthorizationBuilder()
            .AddPolicy("DevicePolicy", policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.RequireClaim("deviceId");
            });

        // Register auth service
        services.AddScoped<IAuthService, AuthService>();

        return services;
    }
}
