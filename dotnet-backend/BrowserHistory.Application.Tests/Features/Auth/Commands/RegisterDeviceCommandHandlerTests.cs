using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Auth.Commands.RegisterDevice;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Auth.Commands;

public class RegisterDeviceCommandHandlerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<IDeviceRepository> _deviceRepositoryMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<ISyncEventRepository> _syncEventRepositoryMock;
    private readonly RegisterDeviceCommandHandler _handler;

    public RegisterDeviceCommandHandlerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _configurationMock = new Mock<IConfiguration>();
        _deviceRepositoryMock = new Mock<IDeviceRepository>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _syncEventRepositoryMock = new Mock<ISyncEventRepository>();

        _configurationMock.Setup(x => x["Jwt:AccessTokenExpiryMinutes"])
            .Returns("120");
        _unitOfWorkMock.Setup(x => x.SyncEvents).Returns(_syncEventRepositoryMock.Object);

        _handler = new RegisterDeviceCommandHandler(
            _authServiceMock.Object,
            _configurationMock.Object,
            _deviceRepositoryMock.Object,
            _unitOfWorkMock.Object);
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

        // Regression guard: registering a device via /auth/register-device must also create the
        // domain Device aggregate in the main DB, or every Sync/History/Page lookup against it
        // fails with "Device not found" even though registration itself reported success.
        _deviceRepositoryMock.Verify(x => x.CreateAsync(
            It.Is<Device>(d => d.Id == deviceId),
            It.IsAny<CancellationToken>()), Times.Once);
        _unitOfWorkMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
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
