using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Auth.Commands.RegisterDevice;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Auth.Commands;

public class RegisterDeviceCommandHandlerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly RegisterDeviceCommandHandler _handler;

    public RegisterDeviceCommandHandlerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _configurationMock = new Mock<IConfiguration>();
        
        _configurationMock.Setup(x => x["Jwt:AccessTokenExpiryMinutes"])
            .Returns("120");

        _handler = new RegisterDeviceCommandHandler(_authServiceMock.Object, _configurationMock.Object);
    }

    [Fact]
    public async Task Handle_WithValidCommand_ShouldReturnSuccessResult()
    {
        // Arrange
        var command = new RegisterDeviceCommand("Test Device", "shared-secret");
        var deviceId = DeviceId.New();
        var accessToken = "access-token";
        var refreshToken = "refresh-token";
        
        _authServiceMock.Setup(x => x.RegisterDeviceAsync(
            command.DeviceName, 
            command.SharedSecret, 
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((deviceId, accessToken, refreshToken));

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.DeviceId.Should().Be(deviceId);
        result.AccessToken.Should().Be(accessToken);
        result.RefreshToken.Should().Be(refreshToken);
        result.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(120), TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Handle_WhenAuthServiceThrows_ShouldPropagate()
    {
        // Arrange
        var command = new RegisterDeviceCommand("Test Device", "invalid-secret");
        
        _authServiceMock.Setup(x => x.RegisterDeviceAsync(
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedAccessException("Invalid shared secret"));

        // Act & Assert
        await _handler.Invoking(h => h.Handle(command, CancellationToken.None))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid shared secret");
    }
}
