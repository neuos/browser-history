using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;

namespace BrowserHistory.Domain.Tests.Entities;

public class HistoryNodeTests
{
    [Fact]
    public void Create_WithValidParameters_ShouldCreateHistoryNode()
    {
        // Arrange
        var url = Url.From("https://example.com");
        var title = "Example Website";
        var visitedAt = DateTime.UtcNow.AddMinutes(-10);

        // Act
        var historyNode = HistoryNode.Create(url, title, visitedAt);

        // Assert
        historyNode.Should().NotBeNull();
        historyNode.Id.Should().NotBe(Guid.Empty);
        historyNode.Url.Should().Be(url);
        historyNode.Title.Should().Be(title);
        historyNode.VisitedAt.Should().Be(visitedAt);
        historyNode.VisitCount.Should().Be(1);
        historyNode.LastVisitedAt.Should().Be(visitedAt);
        historyNode.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        historyNode.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        historyNode.IsBookmarked.Should().BeFalse();
        historyNode.FaviconUrl.Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("   ")]
    public void Create_WithInvalidTitle_ShouldThrowArgumentException(string invalidTitle)
    {
        // Arrange
        var url = Url.From("https://example.com");
        var visitedAt = DateTime.UtcNow.AddMinutes(-10);

        // Act & Assert
        var act = () => HistoryNode.Create(url, invalidTitle, visitedAt);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Title cannot be null or empty*");
    }

    [Fact]
    public void Create_WithNullTitle_ShouldThrowArgumentException()
    {
        // Arrange
        var url = Url.From("https://example.com");
        var visitedAt = DateTime.UtcNow.AddMinutes(-10);

        // Act & Assert
        var act = () => HistoryNode.Create(url, null!, visitedAt);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Title cannot be null or empty*");
    }

    [Fact]
    public void Create_WithTooLongTitle_ShouldThrowArgumentException()
    {
        // Arrange
        var url = Url.From("https://example.com");
        var longTitle = new string('a', 501); // 501 characters
        var visitedAt = DateTime.UtcNow.AddMinutes(-10);

        // Act & Assert
        var act = () => HistoryNode.Create(url, longTitle, visitedAt);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Title cannot exceed 500 characters*");
    }

    [Fact]
    public void Create_WithFutureVisitTime_ShouldThrowArgumentException()
    {
        // Arrange
        var url = Url.From("https://example.com");
        var title = "Example Website";
        var futureTime = DateTime.UtcNow.AddMinutes(10);

        // Act & Assert
        var act = () => HistoryNode.Create(url, title, futureTime);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Visit time cannot be in the future*");
    }

    [Fact]
    public void Create_WithTitleWithWhitespace_ShouldTrimWhitespace()
    {
        // Arrange
        var url = Url.From("https://example.com");
        var titleWithWhitespace = "  Example Website  ";
        var visitedAt = DateTime.UtcNow.AddMinutes(-10);

        // Act
        var historyNode = HistoryNode.Create(url, titleWithWhitespace, visitedAt);

        // Assert
        historyNode.Title.Should().Be("Example Website");
    }

    [Fact]
    public void RecordVisit_WithValidTime_ShouldUpdateVisitCountAndLastVisited()
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Example Website",
            DateTime.UtcNow.AddHours(-2));
        var newVisitTime = DateTime.UtcNow.AddMinutes(-10);
        var originalUpdatedAt = historyNode.UpdatedAt;

        Thread.Sleep(10);

        // Act
        historyNode.RecordVisit(newVisitTime);

        // Assert
        historyNode.VisitCount.Should().Be(2);
        historyNode.LastVisitedAt.Should().Be(newVisitTime);
        historyNode.UpdatedAt.Should().BeAfter(originalUpdatedAt);
    }

    [Fact]
    public void RecordVisit_WithEarlierTime_ShouldNotUpdateLastVisited()
    {
        // Arrange
        var originalVisitTime = DateTime.UtcNow.AddMinutes(-10);
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Example Website",
            originalVisitTime);
        var earlierVisitTime = DateTime.UtcNow.AddHours(-2);

        // Act
        historyNode.RecordVisit(earlierVisitTime);

        // Assert
        historyNode.VisitCount.Should().Be(2);
        historyNode.LastVisitedAt.Should().Be(originalVisitTime);
    }

    [Fact]
    public void RecordVisit_WithFutureTime_ShouldThrowArgumentException()
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Example Website",
            DateTime.UtcNow.AddMinutes(-10));
        var futureTime = DateTime.UtcNow.AddMinutes(10);

        // Act & Assert
        var act = () => historyNode.RecordVisit(futureTime);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Visit time cannot be in the future*");
    }

    [Fact]
    public void UpdateTitle_WithValidTitle_ShouldUpdateTitle()
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Original Title",
            DateTime.UtcNow.AddMinutes(-10));
        var newTitle = "Updated Title";
        var originalUpdatedAt = historyNode.UpdatedAt;

        Thread.Sleep(10);

        // Act
        historyNode.UpdateTitle(newTitle);

        // Assert
        historyNode.Title.Should().Be(newTitle);
        historyNode.UpdatedAt.Should().BeAfter(originalUpdatedAt);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public void UpdateTitle_WithInvalidTitle_ShouldThrowArgumentException(string invalidTitle)
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Original Title",
            DateTime.UtcNow.AddMinutes(-10));

        // Act & Assert
        var act = () => historyNode.UpdateTitle(invalidTitle);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Title cannot be null or empty*");
    }

    [Fact]
    public void UpdateTitle_WithNullTitle_ShouldThrowArgumentException()
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Original Title",
            DateTime.UtcNow.AddMinutes(-10));

        // Act & Assert
        var act = () => historyNode.UpdateTitle(null!);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Title cannot be null or empty*");
    }

    [Fact]
    public void SetFavicon_WithValidUrl_ShouldSetFavicon()
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Example Website",
            DateTime.UtcNow.AddMinutes(-10));
        var faviconUrl = "https://example.com/favicon.ico";

        // Act
        historyNode.SetFavicon(faviconUrl);

        // Assert
        historyNode.FaviconUrl.Should().Be(faviconUrl);
    }

    [Fact]
    public void SetFavicon_WithNull_ShouldSetToNull()
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Example Website",
            DateTime.UtcNow.AddMinutes(-10));

        // Act
        historyNode.SetFavicon(null);

        // Assert
        historyNode.FaviconUrl.Should().BeNull();
    }

    [Theory]
    [InlineData("invalid-url")]
    [InlineData("ftp://example.com/favicon.ico")]
    [InlineData("file:///path/to/favicon.ico")]
    public void SetFavicon_WithInvalidUrl_ShouldThrowArgumentException(string invalidUrl)
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Example Website",
            DateTime.UtcNow.AddMinutes(-10));

        // Act & Assert
        var act = () => historyNode.SetFavicon(invalidUrl);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Invalid favicon URL format*");
    }

    [Fact]
    public void Bookmark_ShouldSetIsBookmarkedToTrue()
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Example Website",
            DateTime.UtcNow.AddMinutes(-10));

        // Act
        historyNode.Bookmark();

        // Assert
        historyNode.IsBookmarked.Should().BeTrue();
    }

    [Fact]
    public void RemoveBookmark_ShouldSetIsBookmarkedToFalse()
    {
        // Arrange
        var historyNode = HistoryNode.Create(
            Url.From("https://example.com"),
            "Example Website",
            DateTime.UtcNow.AddMinutes(-10));
        historyNode.Bookmark();

        // Act
        historyNode.RemoveBookmark();

        // Assert
        historyNode.IsBookmarked.Should().BeFalse();
    }

    [Fact]
    public void MergeVisits_WithSameUrl_ShouldMergeSuccessfully()
    {
        // Arrange
        var url = Url.From("https://example.com");
        var historyNode1 = HistoryNode.Create(url, "Title 1", DateTime.UtcNow.AddHours(-2));
        historyNode1.RecordVisit(DateTime.UtcNow.AddHours(-1));
        
        var historyNode2 = HistoryNode.Create(url, "Title 2", DateTime.UtcNow.AddHours(-3));
        historyNode2.RecordVisit(DateTime.UtcNow.AddMinutes(-30));
        historyNode2.RecordVisit(DateTime.UtcNow.AddMinutes(-10));
        historyNode2.Bookmark();

        Thread.Sleep(10);

        // Act
        historyNode1.MergeVisits(historyNode2);

        // Assert
        historyNode1.VisitCount.Should().Be(5); // 2 + 3 visits
        historyNode1.VisitedAt.Should().Be(historyNode2.VisitedAt); // Earlier time
        historyNode1.LastVisitedAt.Should().Be(historyNode2.LastVisitedAt); // Later time
        historyNode1.IsBookmarked.Should().BeTrue();
        historyNode1.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void MergeVisits_WithDifferentUrl_ShouldThrowArgumentException()
    {
        // Arrange
        var historyNode1 = HistoryNode.Create(
            Url.From("https://example.com"),
            "Example",
            DateTime.UtcNow.AddMinutes(-10));
        var historyNode2 = HistoryNode.Create(
            Url.From("https://different.com"),
            "Different",
            DateTime.UtcNow.AddMinutes(-5));

        // Act & Assert
        var act = () => historyNode1.MergeVisits(historyNode2);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Cannot merge visits from different URLs*");
    }

    [Fact]
    public void Create_WithMaxLengthTitle_ShouldSucceed()
    {
        // Arrange
        var url = Url.From("https://example.com");
        var maxLengthTitle = new string('a', 500); // 500 characters
        var visitedAt = DateTime.UtcNow.AddMinutes(-10);

        // Act
        var historyNode = HistoryNode.Create(url, maxLengthTitle, visitedAt);

        // Assert
        historyNode.Title.Should().Be(maxLengthTitle);
    }
}
