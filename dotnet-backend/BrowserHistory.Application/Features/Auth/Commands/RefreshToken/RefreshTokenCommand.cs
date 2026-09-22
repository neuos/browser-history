using MediatR;

namespace BrowserHistory.Application.Features.Auth.Commands.RefreshToken;

/// <summary>
/// Command to refresh an access token. Despite the property name (kept to avoid touching every
/// caller), this carries the client's current *access* token from the Authorization header, not
/// a separate refresh-token secret - see AuthService.RefreshTokenAsync for why.
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
