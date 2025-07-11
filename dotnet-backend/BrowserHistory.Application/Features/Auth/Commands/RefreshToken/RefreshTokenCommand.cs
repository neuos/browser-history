using MediatR;

namespace BrowserHistory.Application.Features.Auth.Commands.RefreshToken;

/// <summary>
/// Command to refresh an access token using a refresh token.
/// </summary>
public sealed record RefreshTokenCommand(
    string RefreshToken
) : IRequest<RefreshTokenResult>;

/// <summary>
/// Result of token refresh.
/// </summary>
public sealed record RefreshTokenResult(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt
);
