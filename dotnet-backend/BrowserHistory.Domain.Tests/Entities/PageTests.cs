using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;

namespace BrowserHistory.Domain.Tests.Entities;

/// <summary>
/// Unit tests for Page entity
/// </summary>
public class PageTests
{
    [Fact]
    public void Create_WithValidData_ShouldCreatePage()
    {
        // Arrange
        var url = Url.Create("https://example.com");
        var title = "Example Page";

        // Act
        var page = Page.Create(url, title);

        // Assert
        page.Id.Should().NotBeEmpty();
        page.Url.Should().Be(url);
        page.Title.Should().Be(title);
        page.ContentLength.Should().Be(0);
        page.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        page.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        page.LastIndexedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public void Create_WithInvalidTitle_ShouldThrowArgumentException(string invalidTitle)
    {
        // Arrange
        var url = Url.Create("https://example.com");

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => Page.Create(url, invalidTitle));
        exception.ParamName.Should().Be("title");
        exception.Message.Should().Contain("Title cannot be null or empty");
    }

    [Fact]
    public void Create_WithNullTitle_ShouldThrowArgumentException()
    {
        // Arrange
        var url = Url.Create("https://example.com");

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => Page.Create(url, null!));
        exception.ParamName.Should().Be("title");
        exception.Message.Should().Contain("Title cannot be null or empty");
    }

    [Fact]
    public void Create_WithTitleTooLong_ShouldThrowArgumentException()
    {
        // Arrange
        var url = Url.Create("https://example.com");
        var longTitle = new string('A', 1001);

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => Page.Create(url, longTitle));
        exception.ParamName.Should().Be("title");
        exception.Message.Should().Contain("Title cannot exceed 1000 characters");
    }

    [Fact]
    public void UpdateTitle_WithValidTitle_ShouldUpdateTitle()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Original Title");
        var originalUpdatedAt = page.UpdatedAt;
        var newTitle = "Updated Title";

        // Wait a small amount to ensure timestamp changes
        Thread.Sleep(1);

        // Act
        page.UpdateTitle(newTitle);

        // Assert
        page.Title.Should().Be(newTitle);
        page.UpdatedAt.Should().BeAfter(originalUpdatedAt);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public void UpdateTitle_WithInvalidTitle_ShouldThrowArgumentException(string invalidTitle)
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Original Title");

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => page.UpdateTitle(invalidTitle));
        exception.ParamName.Should().Be("newTitle");
    }

    [Fact]
    public void UpdateTitle_WithNullTitle_ShouldThrowArgumentException()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Original Title");

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => page.UpdateTitle(null!));
        exception.ParamName.Should().Be("newTitle");
    }

    [Fact]
    public void UpdateDescription_WithValidDescription_ShouldUpdateDescription()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var description = "This is a test page description";

        // Act
        page.UpdateDescription(description);

        // Assert
        page.Description.Should().Be(description);
    }

    [Fact]
    public void UpdateDescription_WithTooLongDescription_ShouldThrowArgumentException()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var longDescription = new string('A', 2001);

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => page.UpdateDescription(longDescription));
        exception.ParamName.Should().Be("description");
        exception.Message.Should().Contain("Description cannot exceed 2000 characters");
    }

    [Fact]
    public void UpdateContent_WithValidContent_ShouldUpdateContentAndLength()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var content = "This is some page content";
        var contentType = "text/html";

        // Act
        page.UpdateContent(content, contentType);

        // Assert
        page.Content.Should().Be(content);
        page.ContentType.Should().Be(contentType);
        page.ContentLength.Should().Be(content.Length);
        page.LastIndexedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void SetFavicon_WithValidUrl_ShouldSetFavicon()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var faviconUrl = "https://example.com/favicon.ico";

        // Act
        page.SetFavicon(faviconUrl);

        // Assert
        page.FaviconUrl.Should().Be(faviconUrl);
    }

    [Theory]
    [InlineData("invalid-url")]
    [InlineData("ftp://example.com/favicon.ico")]
    public void SetFavicon_WithInvalidUrl_ShouldThrowArgumentException(string invalidUrl)
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => page.SetFavicon(invalidUrl));
        exception.ParamName.Should().Be("faviconUrl");
        exception.Message.Should().Contain("Invalid favicon URL format");
    }

    [Fact]
    public void SetLanguage_WithValidLanguage_ShouldSetLanguage()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var language = "en-US";

        // Act
        page.SetLanguage(language);

        // Assert
        page.Language.Should().Be("en-us"); // Should be lowercase
    }

    [Fact]
    public void SetLanguage_WithTooLongLanguage_ShouldThrowArgumentException()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var longLanguage = "very-long-language-code";

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => page.SetLanguage(longLanguage));
        exception.ParamName.Should().Be("language");
        exception.Message.Should().Contain("Language code cannot exceed 10 characters");
    }

    [Theory]
    [InlineData(200)]
    [InlineData(404)]
    [InlineData(500)]
    public void SetHttpStatus_WithValidStatusCode_ShouldSetStatusCode(int statusCode)
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");

        // Act
        page.SetHttpStatus(statusCode);

        // Assert
        page.StatusCode.Should().Be(statusCode);
    }

    [Theory]
    [InlineData(99)]
    [InlineData(600)]
    public void SetHttpStatus_WithInvalidStatusCode_ShouldThrowArgumentException(int invalidStatusCode)
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => page.SetHttpStatus(invalidStatusCode));
        exception.ParamName.Should().Be("statusCode");
        exception.Message.Should().Contain("Status code must be between 100 and 599");
    }

    [Fact]
    public void MarkAsIndexed_ShouldUpdateLastIndexedAt()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var originalIndexedAt = page.LastIndexedAt;

        // Wait to ensure timestamp changes
        Thread.Sleep(1);

        // Act
        page.MarkAsIndexed();

        // Assert
        page.LastIndexedAt.Should().BeAfter(originalIndexedAt);
    }

    [Fact]
    public void IsContentStale_WithStaleContent_ShouldReturnTrue()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var maxAge = TimeSpan.FromHours(1);

        // Simulate old content by manipulating the private field through reflection
        var lastIndexedAtField = typeof(Page).GetField("<LastIndexedAt>k__BackingField", 
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        lastIndexedAtField?.SetValue(page, DateTime.UtcNow.AddHours(-2));

        // Act
        var isStale = page.IsContentStale(maxAge);

        // Assert
        isStale.Should().BeTrue();
    }

    [Fact]
    public void IsContentStale_WithFreshContent_ShouldReturnFalse()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var maxAge = TimeSpan.FromHours(1);

        // Act
        var isStale = page.IsContentStale(maxAge);

        // Assert
        isStale.Should().BeFalse();
    }

    [Fact]
    public void GetSummary_WithDescription_ShouldReturnDescription()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var description = "Short description";
        page.UpdateDescription(description);

        // Act
        var summary = page.GetSummary();

        // Assert
        summary.Should().Be(description);
    }

    [Fact]
    public void GetSummary_WithoutDescription_ShouldReturnTitle()
    {
        // Arrange
        var title = "Example Title";
        var page = Page.Create(Url.Create("https://example.com"), title);

        // Act
        var summary = page.GetSummary();

        // Assert
        summary.Should().Be(title);
    }

    [Fact]
    public void GetSummary_WithLongDescription_ShouldTruncate()
    {
        // Arrange
        var page = Page.Create(Url.Create("https://example.com"), "Title");
        var longDescription = new string('A', 250);
        page.UpdateDescription(longDescription);

        // Act
        var summary = page.GetSummary(200);

        // Assert
        summary.Should().HaveLength(200);
        summary.Should().EndWith("...");
    }
}
