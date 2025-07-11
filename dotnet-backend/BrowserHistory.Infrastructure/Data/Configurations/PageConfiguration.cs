using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrowserHistory.Infrastructure.Data.Configurations;

/// <summary>
/// Entity Framework configuration for Page entity
/// </summary>
public class PageConfiguration : IEntityTypeConfiguration<Page>
{
    public void Configure(EntityTypeBuilder<Page> builder)
    {
        builder.ToTable("Pages");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .HasColumnName("Id")
            .IsRequired();

        builder.Property(p => p.Url)
            .HasColumnName("Url")
            .HasMaxLength(2000)
            .IsRequired();

        builder.Property(p => p.Title)
            .HasColumnName("Title")
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(p => p.Description)
            .HasColumnName("Description")
            .HasMaxLength(2000);

        builder.Property(p => p.Content)
            .HasColumnName("Content")
            .HasColumnType("TEXT"); // For large content

        builder.Property(p => p.FaviconUrl)
            .HasColumnName("FaviconUrl")
            .HasMaxLength(500);

        builder.Property(p => p.Language)
            .HasColumnName("Language")
            .HasMaxLength(10);

        builder.Property(p => p.Keywords)
            .HasColumnName("Keywords")
            .HasMaxLength(2000);

        builder.Property(p => p.LastIndexedAt)
            .HasColumnName("LastIndexedAt")
            .IsRequired();

        builder.Property(p => p.CreatedAt)
            .HasColumnName("CreatedAt")
            .IsRequired();

        builder.Property(p => p.UpdatedAt)
            .HasColumnName("UpdatedAt")
            .IsRequired();

        builder.Property(p => p.ContentLength)
            .HasColumnName("ContentLength")
            .IsRequired();

        builder.Property(p => p.ContentType)
            .HasColumnName("ContentType")
            .HasMaxLength(100);

        builder.Property(p => p.StatusCode)
            .HasColumnName("StatusCode");

        // Indexes for performance
        builder.HasIndex(p => p.Url)
            .HasDatabaseName("IX_Pages_Url")
            .IsUnique();

        builder.HasIndex(p => p.LastIndexedAt)
            .HasDatabaseName("IX_Pages_LastIndexedAt");

        builder.HasIndex(p => p.Language)
            .HasDatabaseName("IX_Pages_Language");

        builder.HasIndex(p => p.ContentLength)
            .HasDatabaseName("IX_Pages_ContentLength");

        // Full-text search index on title and content
        builder.HasIndex(p => p.Title)
            .HasDatabaseName("IX_Pages_Title");
    }
}
