using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BrowserHistory.Infrastructure.Data;

/// <summary>
/// Entity Framework DbContext for Browser History application
/// </summary>
public class BrowserHistoryDbContext : DbContext
{
    public BrowserHistoryDbContext(DbContextOptions<BrowserHistoryDbContext> options)
        : base(options)
    {
    }

    public DbSet<Device> Devices => Set<Device>();
    public DbSet<HistoryNode> HistoryNodes => Set<HistoryNode>();
    public DbSet<SyncEvent> SyncEvents => Set<SyncEvent>();
    public DbSet<Page> Pages => Set<Page>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from the current assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BrowserHistoryDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);

        // Configure value object conversions
        configurationBuilder
            .Properties<DeviceId>()
            .HaveConversion<DeviceIdConverter>();

        configurationBuilder
            .Properties<Url>()
            .HaveConversion<UrlConverter>();
    }
}

/// <summary>
/// Value converter for DeviceId
/// </summary>
public class DeviceIdConverter : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DeviceId, Guid>
{
    public DeviceIdConverter() : base(
        deviceId => deviceId.Value,
        guid => DeviceId.From(guid))
    {
    }
}

/// <summary>
/// Value converter for Url
/// </summary>
public class UrlConverter : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<Url, string>
{
    public UrlConverter() : base(
        url => url.Value,
        str => Url.From(str))
    {
    }
}
