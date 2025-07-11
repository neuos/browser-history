using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Auth.Queries.GetDeviceInfo;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Auth.Queries;

public class GetDeviceInfoQueryHandlerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly GetDeviceInfoQueryHandler _handler;

    public GetDeviceInfoQueryHandlerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _handler = new GetDeviceInfoQueryHandler(_authServiceMock.Object);
    }

    [Fact]
    public async Task Handle_WithValidToken_ShouldReturnDeviceInfo()
    {
        // Arrange
        var query = new GetDeviceInfoQuery("valid-access-token");
        var deviceId = DeviceId.New();
        var deviceName = "Test Device";
        var registeredAt = DateTime.UtcNow.AddDays(-30);
        var lastSeen = DateTime.UtcNow;
        var isActive = true;
        
        _authServiceMock.Setup(x => x.GetDeviceInfoAsync(
            query.AccessToken, 
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((deviceId, deviceName, registeredAt, lastSeen, isActive));

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.DeviceId.Should().Be(deviceId);
        result.DeviceName.Should().Be(deviceName);
        result.RegisteredAt.Should().Be(registeredAt);
        result.LastSeen.Should().Be(lastSeen);
        result.IsActive.Should().Be(isActive);
    }

    [Fact]
    public async Task Handle_WithInvalidToken_ShouldReturnNull()
    {
        // Arrange
        var query = new GetDeviceInfoQuery("invalid-access-token");
        
        _authServiceMock.Setup(x => x.GetDeviceInfoAsync(
            query.AccessToken, 
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(((DeviceId, string, DateTime, DateTime, bool)?)null);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }
}
