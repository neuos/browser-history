using BrowserHistory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrowserHistory.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Framework configuration for SyncEvent entity
/// </summary>
public class SyncEventConfiguration : IEntityTypeConfiguration<SyncEvent>
{
    public void Configure(EntityTypeBuilder<SyncEvent> builder)
    {
        builder.ToTable("SyncEvents");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id)
            .HasColumnName("Id")
            .IsRequired();

        builder.Property(s => s.DeviceId)
            .HasColumnName("DeviceId")
            .IsRequired();

        builder.Property(s => s.EventType)
            .HasColumnName("EventType")
            .HasConversion<int>()
            .IsRequired();

        builder.Property(s => s.Metadata)
            .HasColumnName("Metadata")
            .HasMaxLength(1000);

        builder.Property(s => s.Timestamp)
            .HasColumnName("Timestamp")
            .IsRequired();

        // Indexes
        builder.HasIndex(s => s.DeviceId)
            .HasDatabaseName("IX_SyncEvents_DeviceId");

        builder.HasIndex(s => s.EventType)
            .HasDatabaseName("IX_SyncEvents_EventType");

        builder.HasIndex(s => s.Timestamp)
            .HasDatabaseName("IX_SyncEvents_Timestamp");

        builder.HasIndex(s => new { s.DeviceId, s.Timestamp })
            .HasDatabaseName("IX_SyncEvents_DeviceId_Timestamp");

        // Foreign key relationship with Device
        builder.HasOne<Device>()
            .WithMany()
            .HasForeignKey(s => s.DeviceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
