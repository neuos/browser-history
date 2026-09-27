using MediatR;

namespace BrowserHistory.Application.Features.Auth.Commands.RefreshToken;

/// <summary>
/// Carries the client's current access token (from the Authorization header) - "refresh" here
/// means proving you hold a still-valid access token, not presenting a separate refresh secret.
/// </summary>
public sealed record RefreshTokenCommand(
    string AccessToken
) : IRequest<RefreshTokenResult>;

public sealed record RefreshTokenResult(
    string AccessToken,
    DateTime ExpiresAt
);
