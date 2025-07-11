using BrowserHistory.Application.Features.Pages.Queries;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Repositories;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Pages;

/// <summary>
/// Tests for GetPageByUrlQuery and its handler
/// </summary>
public class GetPageByUrlQueryTests
{
    private readonly Mock<IPageRepository> _mockPageRepository;
    private readonly GetPageByUrlQueryHandler _handler;

    public GetPageByUrlQueryTests()
    {
        _mockPageRepository = new Mock<IPageRepository>();
        _handler = new GetPageByUrlQueryHandler(_mockPageRepository.Object);
    }

    [Fact]
    public async Task Handle_WithExistingPage_ShouldReturnPageDto()
    {
        // Arrange
        var url = "https://example.com";
        var page = Page.Create(Url.Create(url), "Test Page");
        page.UpdateDescription("Test description");
        page.UpdateContent("Test content", "text/html");
        page.SetLanguage("en");

        var query = new GetPageByUrlQuery { Url = url };

        _mockPageRepository
            .Setup(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(page);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Url.Should().Be("https://example.com/"); // URL gets normalized with trailing slash
        result.Title.Should().Be("Test Page");
        result.Description.Should().Be("Test description");
        result.Content.Should().Be("Test content");
        result.ContentType.Should().Be("text/html");
        result.Language.Should().Be("en");
        result.IsStale.Should().BeFalse(); // Just created, so not stale
        result.Summary.Should().Be("Test description");

        _mockPageRepository.Verify(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithNonExistentPage_ShouldReturnNull()
    {
        // Arrange
        var query = new GetPageByUrlQuery { Url = "https://nonexistent.com" };

        _mockPageRepository
            .Setup(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Page?)null);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().BeNull();

        _mockPageRepository.Verify(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithPageWithoutDescription_ShouldUseTitleAsSummary()
    {
        // Arrange
        var url = "https://example.com";
        var page = Page.Create(Url.Create(url), "Test Page Without Description");

        var query = new GetPageByUrlQuery { Url = url };

        _mockPageRepository
            .Setup(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(page);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Description.Should().BeNull();
        result.Summary.Should().Be("Test Page Without Description");
    }

    [Fact]
    public async Task Handle_WithLongDescription_ShouldTruncateSummary()
    {
        // Arrange
        var url = "https://example.com";
        var longDescription = new string('a', 250); // 250 characters
        var page = Page.Create(Url.Create(url), "Test Page");
        page.UpdateDescription(longDescription);

        var query = new GetPageByUrlQuery { Url = url };

        _mockPageRepository
            .Setup(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(page);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Description.Should().Be(longDescription);
        result.Summary.Should().HaveLength(200); // Default maxLength is 200, but truncated to 197 + "..."
        result.Summary.Should().EndWith("...");
    }
}
