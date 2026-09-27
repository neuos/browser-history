using BrowserHistory.Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace BrowserHistory.Application.Features.Auth.Commands.RefreshToken;

public sealed class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, RefreshTokenResult>
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public RefreshTokenCommandHandler(
        IAuthService authService,
        IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    public async Task<RefreshTokenResult> Handle(
        RefreshTokenCommand request,
        CancellationToken cancellationToken)
    {
        var accessToken = await _authService.RefreshTokenAsync(request.AccessToken, cancellationToken);

        var accessTokenExpiryMinutes = int.TryParse(_configuration["Jwt:AccessTokenExpiryMinutes"], out var minutes) ? minutes : 60;
        var expiresAt = DateTime.UtcNow.AddMinutes(accessTokenExpiryMinutes);

        return new RefreshTokenResult(accessToken, expiresAt);
    }
}
