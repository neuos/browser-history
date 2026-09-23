using BrowserHistory.Application.Common.Interfaces;
using MediatR;

namespace BrowserHistory.Application.Features.Favicons.Queries;

/// <summary>
/// Query to fetch a favicon blob's raw bytes by content hash - what a device calls when it
/// receives a sync event referencing a hash it doesn't have stored locally yet.
/// </summary>
public sealed record GetFaviconByHashQuery(string Hash) : IRequest<GetFaviconByHashResult?>;

public sealed record GetFaviconByHashResult(byte[] Data, string ContentType);

public class GetFaviconByHashQueryHandler : IRequestHandler<GetFaviconByHashQuery, GetFaviconByHashResult?>
{
    private readonly IFaviconBlobRepository _faviconBlobRepository;

    public GetFaviconByHashQueryHandler(IFaviconBlobRepository faviconBlobRepository)
    {
        _faviconBlobRepository = faviconBlobRepository;
    }

    public async Task<GetFaviconByHashResult?> Handle(GetFaviconByHashQuery request, CancellationToken cancellationToken)
    {
        var blob = await _faviconBlobRepository.GetByHashAsync(request.Hash.ToLowerInvariant(), cancellationToken);
        return blob == null ? null : new GetFaviconByHashResult(blob.Data, blob.ContentType);
    }
}
