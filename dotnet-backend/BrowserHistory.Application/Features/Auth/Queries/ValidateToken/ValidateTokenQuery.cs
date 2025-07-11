using BrowserHistory.Domain.ValueObjects;
using MediatR;

namespace BrowserHistory.Application.Features.Auth.Queries.ValidateToken;

/// <summary>
/// Query to validate an access token.
/// </summary>
public sealed record ValidateTokenQuery(
    string AccessToken
) : IRequest<ValidateTokenResult>;

/// <summary>
/// Result of token validation.
/// </summary>
public sealed record ValidateTokenResult(
    bool IsValid,
    DeviceId? DeviceId
);
