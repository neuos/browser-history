using BrowserHistory.Application.Features.Auth.Commands.RegisterDevice;
using FluentAssertions;
using FluentValidation;
using Xunit;

namespace BrowserHistory.Application.Tests.Features.Auth.Validators;

public class RegisterDeviceCommandValidatorTests
{
    private readonly RegisterDeviceCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_ShouldNotHaveValidationErrors()
    {
        // Arrange
        var command = new RegisterDeviceCommand("Valid Device Name", "valid-shared-secret");

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_WithInvalidDeviceName_ShouldHaveValidationError(string? invalidDeviceName)
    {
        // Arrange
        var command = new RegisterDeviceCommand(invalidDeviceName!, "valid-shared-secret");

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "DeviceName");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_WithInvalidSharedSecret_ShouldHaveValidationError(string? invalidSharedSecret)
    {
        // Arrange
        var command = new RegisterDeviceCommand("Valid Device Name", invalidSharedSecret!);

        // Act
        var result = _validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "SharedSecret");
    }
}
