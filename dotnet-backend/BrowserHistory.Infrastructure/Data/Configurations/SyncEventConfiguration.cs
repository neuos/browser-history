using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Enums;
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

        builder.Property(s => s.EntityId)
            .HasColumnName("EntityId")
            .HasMaxLength(2000) // pages are keyed by URL, not a GUID
            .IsRequired();

        builder.Property(s => s.DeviceId)
            .HasColumnName("DeviceId")
            .IsRequired();

        builder.Property(s => s.Timestamp)
            .HasColumnName("Timestamp")
            .IsRequired();

        builder.Property(s => s.EventType)
            .HasColumnName("EventType")
            .HasConversion<int>()
            .IsRequired();

        builder.Property(s => s.EntityType)
            .HasColumnName("EntityType")
            .HasConversion<int>()
            .IsRequired();

        builder.Property(s => s.Data)
            .HasColumnName("Data")
            .HasColumnType("TEXT")
            .IsRequired();

        builder.Property(s => s.Checksum)
            .HasColumnName("Checksum")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(s => s.Metadata)
            .HasColumnName("Metadata")
            .HasMaxLength(1000);

        // Indexes
        builder.HasIndex(s => s.EntityId)
            .HasDatabaseName("IX_SyncEvents_EntityId");

        builder.HasIndex(s => s.DeviceId)
            .HasDatabaseName("IX_SyncEvents_DeviceId");

        builder.HasIndex(s => s.EventType)
            .HasDatabaseName("IX_SyncEvents_EventType");

        builder.HasIndex(s => s.EntityType)
            .HasDatabaseName("IX_SyncEvents_EntityType");

        builder.HasIndex(s => s.Timestamp)
            .HasDatabaseName("IX_SyncEvents_Timestamp");

        builder.HasIndex(s => s.Checksum)
            .HasDatabaseName("IX_SyncEvents_Checksum");

        builder.HasIndex(s => new { s.DeviceId, s.Timestamp })
            .HasDatabaseName("IX_SyncEvents_DeviceId_Timestamp");

        builder.HasIndex(s => new { s.EntityType, s.EntityId })
            .HasDatabaseName("IX_SyncEvents_EntityType_EntityId");
    }
}
