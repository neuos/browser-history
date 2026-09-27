using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BrowserHistory.Infrastructure.Data;

public class BrowserHistoryDbContext : DbContext
{
    public BrowserHistoryDbContext(DbContextOptions<BrowserHistoryDbContext> options)
        : base(options)
    {
    }

    public DbSet<Device> Devices => Set<Device>();
    public DbSet<SyncEvent> SyncEvents => Set<SyncEvent>();
    public DbSet<FaviconBlob> FaviconBlobs => Set<FaviconBlob>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BrowserHistoryDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);

        configurationBuilder
            .Properties<DeviceId>()
            .HaveConversion<DeviceIdConverter>();
    }
}

public class DeviceIdConverter : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DeviceId, Guid>
{
    public DeviceIdConverter() : base(
        deviceId => deviceId.Value,
        guid => DeviceId.From(guid))
    {
    }
}
