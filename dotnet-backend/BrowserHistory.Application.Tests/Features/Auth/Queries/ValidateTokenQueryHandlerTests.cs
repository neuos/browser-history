using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Auth.Queries.ValidateToken;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Auth.Queries;

public class ValidateTokenQueryHandlerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly ValidateTokenQueryHandler _handler;

    public ValidateTokenQueryHandlerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _handler = new ValidateTokenQueryHandler(_authServiceMock.Object);
    }

    [Fact]
    public async Task Handle_WithValidToken_ShouldReturnValidResult()
    {
        // Arrange
        var query = new ValidateTokenQuery("valid-access-token");
        var deviceId = DeviceId.New();
        
        _authServiceMock.Setup(x => x.ValidateTokenAsync(
            query.AccessToken, 
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(deviceId);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeTrue();
        result.DeviceId.Should().Be(deviceId);
    }

    [Fact]
    public async Task Handle_WithInvalidToken_ShouldReturnInvalidResult()
    {
        // Arrange
        var query = new ValidateTokenQuery("invalid-access-token");
        
        _authServiceMock.Setup(x => x.ValidateTokenAsync(
            query.AccessToken, 
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((DeviceId?)null);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeFalse();
        result.DeviceId.Should().BeNull();
    }
}
