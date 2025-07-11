using BrowserHistory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrowserHistory.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Framework configuration for Device entity
/// </summary>
public class DeviceConfiguration : IEntityTypeConfiguration<Device>
{
    public void Configure(EntityTypeBuilder<Device> builder)
    {
        builder.ToTable("Devices");

        builder.HasKey(d => d.Id);

        builder.Property(d => d.Id)
            .HasColumnName("Id")
            .IsRequired();

        builder.Property(d => d.DeviceName)
            .HasColumnName("DeviceName")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(d => d.RegisteredAt)
            .HasColumnName("RegisteredAt")
            .IsRequired();

        builder.Property(d => d.LastSeen)
            .HasColumnName("LastSeen")
            .IsRequired();

        builder.Property(d => d.IsActive)
            .HasColumnName("IsActive")
            .IsRequired();

        // Indexes
        builder.HasIndex(d => d.DeviceName)
            .HasDatabaseName("IX_Devices_DeviceName")
            .IsUnique();

        builder.HasIndex(d => d.IsActive)
            .HasDatabaseName("IX_Devices_IsActive");

        builder.HasIndex(d => d.LastSeen)
            .HasDatabaseName("IX_Devices_LastSeen");
    }
}
