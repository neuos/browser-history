using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Domain.ValueObjects;
using BrowserHistory.Infrastructure.Identity;
using BrowserHistory.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace BrowserHistory.Application.Tests.Services;

public class AuthServiceTests
{
    private readonly Mock<UserManager<DeviceUser>> _userManagerMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _userManagerMock = CreateUserManagerMock();
        _configurationMock = new Mock<IConfiguration>();
        
        // Setup configuration mock using sections
        var jwtSection = new Mock<IConfigurationSection>();
        jwtSection.Setup(x => x["Secret"]).Returns("test-jwt-secret-key-that-is-long-enough-for-hmac-sha256");
        jwtSection.Setup(x => x["Issuer"]).Returns("Test.Issuer");
        jwtSection.Setup(x => x["Audience"]).Returns("Test.Audience");
        jwtSection.Setup(x => x["AccessTokenExpiryMinutes"]).Returns("60");
        jwtSection.Setup(x => x["RefreshTokenExpiryDays"]).Returns("7");
        
        var authSection = new Mock<IConfigurationSection>();
        authSection.Setup(x => x["SharedSecret"]).Returns("test-shared-secret");

        _configurationMock.Setup(x => x.GetSection("Jwt")).Returns(jwtSection.Object);
        _configurationMock.Setup(x => x.GetSection("Auth")).Returns(authSection.Object);
        _configurationMock.Setup(x => x["Jwt:Secret"])
            .Returns("test-jwt-secret-key-that-is-long-enough-for-hmac-sha256");
        _configurationMock.Setup(x => x["Jwt:Issuer"])
            .Returns("Test.Issuer");
        _configurationMock.Setup(x => x["Jwt:Audience"])
            .Returns("Test.Audience");
        _configurationMock.Setup(x => x["Auth:SharedSecret"])
            .Returns("test-shared-secret");
        _configurationMock.Setup(x => x["Jwt:AccessTokenExpiryMinutes"])
            .Returns("60");
        _configurationMock.Setup(x => x["Jwt:RefreshTokenExpiryDays"])
            .Returns("7");

        _authService = new AuthService(_userManagerMock.Object, _configurationMock.Object);
    }

    [Fact]
    public async Task RegisterDeviceAsync_WithValidSharedSecret_ShouldReturnTokens()
    {
        // Arrange
        const string deviceName = "Test Device";
        const string sharedSecret = "test-shared-secret";
        
        _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<DeviceUser>()))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(x => x.SetAuthenticationTokenAsync(
            It.IsAny<DeviceUser>(), 
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _authService.RegisterDeviceAsync(deviceName, sharedSecret);

        // Assert
        result.DeviceId.Should().NotBe(default(DeviceId));
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
        
        _userManagerMock.Verify(x => x.CreateAsync(It.Is<DeviceUser>(d => 
            d.DeviceName == deviceName)), Times.Once);
    }

    [Fact]
    public async Task RegisterDeviceAsync_WithInvalidSharedSecret_ShouldThrowUnauthorizedException()
    {
        // Arrange
        const string deviceName = "Test Device";
        const string invalidSharedSecret = "wrong-secret";

        // Act & Assert
        await _authService.Invoking(s => s.RegisterDeviceAsync(deviceName, invalidSharedSecret))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid shared secret");
    }

    [Fact]
    public async Task RegisterDeviceAsync_WhenUserCreationFails_ShouldThrowInvalidOperationException()
    {
        // Arrange
        const string deviceName = "Test Device";
        const string sharedSecret = "test-shared-secret";
        
        var failureResult = IdentityResult.Failed(new IdentityError { Description = "Creation failed" });
        _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<DeviceUser>()))
            .ReturnsAsync(failureResult);

        // Act & Assert
        await _authService.Invoking(s => s.RegisterDeviceAsync(deviceName, sharedSecret))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Failed to register device: Creation failed");
    }

    [Fact]
    public async Task ValidateTokenAsync_WithValidToken_ShouldReturnDeviceId()
    {
        // Arrange - First register a device to get a valid token
        const string deviceName = "Test Device";
        const string sharedSecret = "test-shared-secret";
        
        _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<DeviceUser>()))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(x => x.SetAuthenticationTokenAsync(
            It.IsAny<DeviceUser>(), 
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);

        var (deviceId, accessToken, _) = await _authService.RegisterDeviceAsync(deviceName, sharedSecret);

        // Act
        var validatedDeviceId = await _authService.ValidateTokenAsync(accessToken);

        // Assert
        validatedDeviceId.Should().Be(deviceId);
    }

    [Fact]
    public async Task ValidateTokenAsync_WithInvalidToken_ShouldReturnNull()
    {
        // Arrange
        const string invalidToken = "invalid.jwt.token";

        // Act
        var result = await _authService.ValidateTokenAsync(invalidToken);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task RefreshTokenAsync_WithCurrentlyValidAccessToken_ShouldReturnNewTokens()
    {
        // Arrange - the client has no separate refresh-token secret, only its own (still-valid)
        // access token, so RefreshTokenAsync takes and validates that instead. Get a genuine,
        // correctly-signed access token the same way the client would: via registration.
        const string deviceName = "Test Device";
        const string sharedSecret = "test-shared-secret";

        _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<DeviceUser>()))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(x => x.SetAuthenticationTokenAsync(
            It.IsAny<DeviceUser>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);

        var registerResult = await _authService.RegisterDeviceAsync(deviceName, sharedSecret);
        var deviceUser = new DeviceUser(registerResult.DeviceId, deviceName, "hashed-secret");

        _userManagerMock.Setup(x => x.FindByIdAsync(registerResult.DeviceId.Value.ToString()))
            .ReturnsAsync(deviceUser);
        _userManagerMock.Setup(x => x.UpdateAsync(deviceUser))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(x => x.RemoveAuthenticationTokenAsync(
            deviceUser, "BrowserHistory", "RefreshToken"))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _authService.RefreshTokenAsync(registerResult.AccessToken);

        // Assert
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.AccessToken.Should().NotBe(registerResult.AccessToken); // a genuinely new token
        result.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task RefreshTokenAsync_WithInvalidAccessToken_ShouldThrowUnauthorizedException()
    {
        // Arrange
        const string invalidAccessToken = "not-a-real-jwt";

        // Act & Assert
        await _authService.Invoking(s => s.RefreshTokenAsync(invalidAccessToken))
            .Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Invalid or expired access token");
    }

    private static Mock<UserManager<DeviceUser>> CreateUserManagerMock()
    {
        var store = new Mock<IUserStore<DeviceUser>>();
        var userManager = new Mock<UserManager<DeviceUser>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        
        return userManager;
    }
}
