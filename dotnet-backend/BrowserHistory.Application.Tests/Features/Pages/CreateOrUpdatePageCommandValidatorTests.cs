using BrowserHistory.Application.Features.Pages.Commands;
using FluentAssertions;
using FluentValidation.TestHelper;

namespace BrowserHistory.Application.Tests.Features.Pages;

/// <summary>
/// Tests for CreateOrUpdatePageCommand validation
/// </summary>
public class CreateOrUpdatePageCommandValidatorTests
{
    private readonly CreateOrUpdatePageCommandValidator _validator;

    public CreateOrUpdatePageCommandValidatorTests()
    {
        _validator = new CreateOrUpdatePageCommandValidator();
    }

    [Fact]
    public void Validate_WithValidCommand_ShouldPass()
    {
        // Arrange
        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = "Valid Title",
            Description = "Valid description",
            FaviconUrl = "https://example.com/favicon.ico",
            Language = "en",
            Keywords = "test, valid"
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public void Validate_WithInvalidUrl_ShouldFail(string? url)
    {
        // Arrange
        var command = new CreateOrUpdatePageCommand
        {
            Url = url!,
            Title = "Valid Title"
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Url);
    }

    [Theory]
    [InlineData("not-a-url")]
    [InlineData("ftp://example.com")]
    [InlineData("file:///path/to/file")]
    public void Validate_WithInvalidUrlFormat_ShouldFail(string url)
    {
        // Arrange
        var command = new CreateOrUpdatePageCommand
        {
            Url = url,
            Title = "Valid Title"
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Url)
            .WithErrorMessage("URL must be a valid HTTP or HTTPS URL");
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public void Validate_WithInvalidTitle_ShouldFail(string? title)
    {
        // Arrange
        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = title!
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void Validate_WithTooLongUrl_ShouldFail()
    {
        // Arrange
        var longUrl = "https://example.com/" + new string('a', 2000);
        var command = new CreateOrUpdatePageCommand
        {
            Url = longUrl,
            Title = "Valid Title"
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Url)
            .WithErrorMessage("URL cannot exceed 2000 characters");
    }

    [Fact]
    public void Validate_WithTooLongTitle_ShouldFail()
    {
        // Arrange
        var longTitle = new string('a', 1001);
        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = longTitle
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Title)
            .WithErrorMessage("Title cannot exceed 1000 characters");
    }

    [Fact]
    public void Validate_WithTooLongDescription_ShouldFail()
    {
        // Arrange
        var longDescription = new string('a', 2001);
        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = "Valid Title",
            Description = longDescription
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Description)
            .WithErrorMessage("Description cannot exceed 2000 characters");
    }

    [Theory]
    [InlineData(99)]
    [InlineData(600)]
    public void Validate_WithInvalidStatusCode_ShouldFail(int statusCode)
    {
        // Arrange
        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = "Valid Title",
            StatusCode = statusCode
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.StatusCode)
            .WithErrorMessage("Status code must be between 100 and 599");
    }

    [Theory]
    [InlineData(200)]
    [InlineData(404)]
    [InlineData(500)]
    public void Validate_WithValidStatusCode_ShouldPass(int statusCode)
    {
        // Arrange
        var command = new CreateOrUpdatePageCommand
        {
            Url = "https://example.com",
            Title = "Valid Title",
            StatusCode = statusCode
        };

        // Act
        var result = _validator.TestValidate(command);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.StatusCode);
    }
}
