using BrowserHistory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrowserHistory.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Framework configuration for HistoryNode entity
/// </summary>
public class HistoryNodeConfiguration : IEntityTypeConfiguration<HistoryNode>
{
    public void Configure(EntityTypeBuilder<HistoryNode> builder)
    {
        builder.ToTable("HistoryNodes");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.Id)
            .HasColumnName("Id")
            .IsRequired();

        builder.Property(h => h.Url)
            .HasColumnName("Url")
            .HasMaxLength(2048)
            .IsRequired();

        builder.Property(h => h.Title)
            .HasColumnName("Title")
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(h => h.VisitedAt)
            .HasColumnName("VisitedAt")
            .IsRequired();

        builder.Property(h => h.VisitCount)
            .HasColumnName("VisitCount")
            .IsRequired();

        builder.Property(h => h.LastVisitedAt)
            .HasColumnName("LastVisitedAt")
            .IsRequired();

        builder.Property(h => h.CreatedAt)
            .HasColumnName("CreatedAt")
            .IsRequired();

        builder.Property(h => h.UpdatedAt)
            .HasColumnName("UpdatedAt")
            .IsRequired();

        builder.Property(h => h.IsBookmarked)
            .HasColumnName("IsBookmarked")
            .IsRequired();

        builder.Property(h => h.FaviconUrl)
            .HasColumnName("FaviconUrl")
            .HasMaxLength(2048);

        // Indexes
        builder.HasIndex(h => h.Url)
            .HasDatabaseName("IX_HistoryNodes_Url")
            .IsUnique();

        builder.HasIndex(h => h.LastVisitedAt)
            .HasDatabaseName("IX_HistoryNodes_LastVisitedAt");

        builder.HasIndex(h => h.IsBookmarked)
            .HasDatabaseName("IX_HistoryNodes_IsBookmarked");

        builder.HasIndex(h => h.Title)
            .HasDatabaseName("IX_HistoryNodes_Title");

        // Full-text search index for title and URL
        builder.HasIndex(h => new { h.Title, h.Url })
            .HasDatabaseName("IX_HistoryNodes_Search");
    }
}
