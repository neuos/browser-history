using BrowserHistory.Application.Features.Auth.Commands.RefreshToken;
using FluentAssertions;
using FluentValidation;
using Xunit;

namespace BrowserHistory.Application.Tests.Features.Auth.Validators;

public class RefreshTokenCommandValidatorTests
{
    private readonly RefreshTokenCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_ShouldNotHaveValidationErrors()
    {
        // Arrange
        var command = new RefreshTokenCommand("valid-refresh-token");

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_WithInvalidRefreshToken_ShouldHaveValidationError(string? invalidRefreshToken)
    {
        // Arrange
        var command = new RefreshTokenCommand(invalidRefreshToken!);

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "RefreshToken");
    }
}
