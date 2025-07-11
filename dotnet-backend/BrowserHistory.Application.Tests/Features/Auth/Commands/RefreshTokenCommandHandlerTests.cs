using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Auth.Commands.RefreshToken;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Auth.Commands;

public class RefreshTokenCommandHandlerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly RefreshTokenCommandHandler _handler;

    public RefreshTokenCommandHandlerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _configurationMock = new Mock<IConfiguration>();
        
        _configurationMock.Setup(x => x["Jwt:AccessTokenExpiryMinutes"])
            .Returns("60");

        _handler = new RefreshTokenCommandHandler(_authServiceMock.Object, _configurationMock.Object);
    }

    [Fact]
    public async Task Handle_WithValidRefreshToken_ShouldReturnNewTokens()
    {
        // Arrange
        var command = new RefreshTokenCommand("valid-refresh-token");
        var newAccessToken = "new-access-token";
        var newRefreshToken = "new-refresh-token";
        
        _authServiceMock.Setup(x => x.RefreshTokenAsync(
            command.RefreshToken, 
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((newAccessToken, newRefreshToken));

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().Be(newAccessToken);
        result.RefreshToken.Should().Be(newRefreshToken);
        result.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(60), TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Handle_WithInvalidRefreshToken_ShouldThrowUnauthorizedException()
    {
        // Arrange
        var command = new RefreshTokenCommand("invalid-refresh-token");
        
        _authServiceMock.Setup(x => x.RefreshTokenAsync(
            It.IsAny<string>(), 
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedAccessException("Invalid refresh token"));

        // Act & Assert
        await _handler.Invoking(h => h.Handle(command, CancellationToken.None))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid refresh token");
    }
}
