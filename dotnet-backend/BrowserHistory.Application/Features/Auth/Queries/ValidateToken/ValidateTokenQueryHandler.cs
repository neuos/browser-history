using BrowserHistory.Application.Common.Interfaces;
using MediatR;

namespace BrowserHistory.Application.Features.Auth.Queries.ValidateToken;

/// <summary>
/// Handler for ValidateTokenQuery.
/// </summary>
public sealed class ValidateTokenQueryHandler : IRequestHandler<ValidateTokenQuery, ValidateTokenResult>
{
    private readonly IAuthService _authService;

    public ValidateTokenQueryHandler(IAuthService authService)
    {
        _authService = authService;
    }

    public async Task<ValidateTokenResult> Handle(
        ValidateTokenQuery request,
        CancellationToken cancellationToken)
    {
        var deviceId = await _authService.ValidateTokenAsync(
            request.AccessToken,
            cancellationToken);

        return new ValidateTokenResult(
            deviceId != null,
            deviceId);
    }
}
