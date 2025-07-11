using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using BrowserHistory.Domain.ValueObjects;

namespace BrowserHistory.Infrastructure.Identity;

/// <summary>
/// Identity DbContext for device authentication using ASP.NET Core Identity.
/// </summary>
public class DeviceIdentityContext : IdentityDbContext<DeviceUser, IdentityRole<Guid>, Guid>
{
    public DeviceIdentityContext(DbContextOptions<DeviceIdentityContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Configure DeviceUser entity
        builder.Entity<DeviceUser>(entity =>
        {
            entity.ToTable("DeviceUsers");

            // Configure DeviceId value object
            entity.Property(e => e.DeviceId)
                .HasConversion(
                    v => v.Value,
                    v => DeviceId.From(v))
                .IsRequired();

            entity.Property(e => e.DeviceName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.RegisteredAt)
                .IsRequired();

            entity.Property(e => e.LastSeen)
                .IsRequired();

            entity.Property(e => e.IsActive)
                .IsRequired();

            entity.Property(e => e.SharedSecretHash)
                .HasMaxLength(500)
                .IsRequired();

            // Indexes for performance
            entity.HasIndex(e => e.DeviceId)
                .IsUnique()
                .HasDatabaseName("IX_DeviceUsers_DeviceId");

            entity.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_DeviceUsers_IsActive");

            entity.HasIndex(e => e.LastSeen)
                .HasDatabaseName("IX_DeviceUsers_LastSeen");
        });

        // Customize Identity table names to avoid conflicts
        builder.Entity<IdentityRole<Guid>>(entity =>
        {
            entity.ToTable("DeviceRoles");
        });

        builder.Entity<IdentityUserRole<Guid>>(entity =>
        {
            entity.ToTable("DeviceUserRoles");
        });

        builder.Entity<IdentityUserClaim<Guid>>(entity =>
        {
            entity.ToTable("DeviceUserClaims");
        });

        builder.Entity<IdentityUserLogin<Guid>>(entity =>
        {
            entity.ToTable("DeviceUserLogins");
        });

        builder.Entity<IdentityUserToken<Guid>>(entity =>
        {
            entity.ToTable("DeviceUserTokens");
        });

        builder.Entity<IdentityRoleClaim<Guid>>(entity =>
        {
            entity.ToTable("DeviceRoleClaims");
        });
    }
}
