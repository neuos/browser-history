using BrowserHistory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrowserHistory.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Framework configuration for FaviconBlob entity
/// </summary>
public class FaviconBlobConfiguration : IEntityTypeConfiguration<FaviconBlob>
{
    public void Configure(EntityTypeBuilder<FaviconBlob> builder)
    {
        builder.ToTable("FaviconBlobs");

        // The hash IS the identity - a favicon is defined by its content, so there is never a
        // separate surrogate key.
        builder.HasKey(f => f.Hash);

        builder.Property(f => f.Hash)
            .HasColumnName("Hash")
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(f => f.ContentType)
            .HasColumnName("ContentType")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(f => f.Data)
            .HasColumnName("Data")
            .IsRequired();

        builder.Property(f => f.SizeBytes)
            .HasColumnName("SizeBytes")
            .IsRequired();

        builder.Property(f => f.CreatedAt)
            .HasColumnName("CreatedAt")
            .IsRequired();
    }
}
