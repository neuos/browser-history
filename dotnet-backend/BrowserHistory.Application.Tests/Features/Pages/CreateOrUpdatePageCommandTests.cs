using BrowserHistory.Application.Features.Pages.Commands;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Repositories;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Pages;

/// <summary>
/// Tests for CreateOrUpdatePageCommand and its handler
/// </summary>
public class CreateOrUpdatePageCommandTests
{
    private readonly Mock<IPageRepository> _mockPageRepository;
    private readonly CreateOrUpdatePageCommandHandler _handler;
    private readonly Mock<ILogger<CreateOrUpdatePageCommandHandler>> _mockLogger;

    public CreateOrUpdatePageCommandTests()
    {
        _mockPageRepository = new Mock<IPageRepository>();
        _mockLogger = new Mock<ILogger<CreateOrUpdatePageCommandHandler>>();
        _handler = new CreateOrUpdatePageCommandHandler(_mockPageRepository.Object);
    }

    [Fact]
    public async Task Handle_WithNewPage_ShouldCreatePage()
    {
        // Arrange
        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = "Example Page",
            Description = "Test description",
            Content = "Test content",
            Language = "en",
            Keywords = "test, example"
        };

        _mockPageRepository
            .Setup(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Page?)null);

        _mockPageRepository
            .Setup(x => x.AddAsync(It.IsAny<Page>(), It.IsAny<CancellationToken>()))
            .Returns<Page, CancellationToken>((page, token) => Task.FromResult(page));

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.WasCreated.Should().BeTrue();
        result.Page.Should().NotBeNull();
        result.Page.Url.Should().Be("https://example.com/"); // URL gets normalized
        result.Page.Title.Should().Be(command.Title);
        result.Page.Description.Should().Be(command.Description);
        result.Page.Language.Should().Be(command.Language);
        result.Page.Keywords.Should().Be(command.Keywords);
        result.Message.Should().Be("Page created successfully");

        _mockPageRepository.Verify(x => x.AddAsync(It.IsAny<Page>(), It.IsAny<CancellationToken>()), Times.Once);
        _mockPageRepository.Verify(x => x.UpdateAsync(It.IsAny<Page>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WithExistingPage_ShouldUpdatePage()
    {
        // Arrange
        var existingPage = Page.Create(Url.Create("https://example.com"), "Old Title");
        existingPage.UpdateDescription("Old description");

        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = "New Title",
            Description = "New description",
            Content = "New content"
        };

        _mockPageRepository
            .Setup(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingPage);

        _mockPageRepository
            .Setup(x => x.UpdateAsync(It.IsAny<Page>(), It.IsAny<CancellationToken>()))
            .Returns<Page, CancellationToken>((page, token) => Task.FromResult(page));

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.WasCreated.Should().BeFalse();
        result.Page.Should().NotBeNull();
        result.Page.Title.Should().Be(command.Title);
        result.Page.Description.Should().Be(command.Description);
        result.Message.Should().Be("Page updated successfully");

        _mockPageRepository.Verify(x => x.UpdateAsync(It.IsAny<Page>(), It.IsAny<CancellationToken>()), Times.Once);
        _mockPageRepository.Verify(x => x.AddAsync(It.IsAny<Page>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("", "Title cannot be null or empty")]
    [InlineData(null, "Title cannot be null or empty")]
    [InlineData("   ", "Title cannot be null or empty")]
    public async Task Handle_WithInvalidTitle_ShouldThrow(string? title, string expectedError)
    {
        // Arrange
        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = title!
        };

        _mockPageRepository
            .Setup(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Page?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => 
            _handler.Handle(command, CancellationToken.None));
        
        exception.Message.Should().Contain(expectedError);
    }

    [Fact]
    public async Task Handle_WithAllOptionalFields_ShouldCreatePageWithAllFields()
    {
        // Arrange
        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = "Complete Page",
            Description = "Test description",
            Content = "Page content",
            FaviconUrl = "https://example.com/favicon.ico",
            Language = "en-US",
            Keywords = "test, page, example",
            ContentType = "text/html",
            StatusCode = 200
        };

        _mockPageRepository
            .Setup(x => x.GetByUrlAsync(It.IsAny<Url>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Page?)null);

        _mockPageRepository
            .Setup(x => x.AddAsync(It.IsAny<Page>(), It.IsAny<CancellationToken>()))
            .Returns<Page, CancellationToken>((page, token) => Task.FromResult(page));

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.WasCreated.Should().BeTrue();
        result.Page.FaviconUrl.Should().Be(command.FaviconUrl);
        result.Page.Language.Should().Be(command.Language.ToLowerInvariant());
        result.Page.Keywords.Should().Be(command.Keywords);
        result.Page.ContentType.Should().Be(command.ContentType);
        result.Page.StatusCode.Should().Be(command.StatusCode);
    }
}
