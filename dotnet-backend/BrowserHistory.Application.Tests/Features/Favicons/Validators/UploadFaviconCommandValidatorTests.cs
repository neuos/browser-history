using BrowserHistory.Application.Features.Favicons.Commands;
using FluentAssertions;

namespace BrowserHistory.Application.Tests.Features.Favicons.Validators;

public class UploadFaviconCommandValidatorTests
{
    private readonly UploadFaviconCommandValidator _validator = new();

    private static UploadFaviconCommand ValidCommand() => new()
    {
        Hash = new string('a', 64),
        ContentType = "image/png",
        DataBase64 = "ZmFrZQ=="
    };

    [Fact]
    public void Validate_WithValidCommand_ShouldNotHaveValidationErrors()
    {
        var result = _validator.Validate(ValidCommand());

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("tooshort")]
    [InlineData("not-hex-chars-but-64-characters-long-000000000000000000000000")]
    public void Validate_WithInvalidHash_ShouldHaveValidationError(string invalidHash)
    {
        var command = ValidCommand() with { Hash = invalidHash };

        var result = _validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Hash");
    }

    [Fact]
    public void Validate_WithEmptyContentType_ShouldHaveValidationError()
    {
        var command = ValidCommand() with { ContentType = "" };

        var result = _validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "ContentType");
    }

    [Fact]
    public void Validate_WithEmptyDataBase64_ShouldHaveValidationError()
    {
        var command = ValidCommand() with { DataBase64 = "" };

        var result = _validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "DataBase64");
    }
}
