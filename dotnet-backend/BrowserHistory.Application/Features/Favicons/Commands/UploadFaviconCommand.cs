using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Favicons.Models;
using BrowserHistory.Domain.Entities;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Favicons.Commands;

/// <summary>
/// Command to upload a favicon blob. Idempotent by content hash: uploading bytes whose hash
/// already exists (from any device) is a cheap no-op, which is what makes dedup work across
/// every device independently discovering the same favicon.
/// </summary>
public sealed record UploadFaviconCommand : IRequest<UploadFaviconResponse>
{
    public required string Hash { get; init; }
    public required string ContentType { get; init; }
    public required string DataBase64 { get; init; }
}

public class UploadFaviconCommandValidator : AbstractValidator<UploadFaviconCommand>
{
    public UploadFaviconCommandValidator()
    {
        RuleFor(x => x.Hash)
            .NotEmpty().WithMessage("Hash is required")
            .Length(64).WithMessage("Hash must be a 64-character hex-encoded SHA-256 digest")
            .Matches("^[0-9a-fA-F]{64}$").WithMessage("Hash must be hexadecimal");

        RuleFor(x => x.ContentType)
            .NotEmpty().WithMessage("Content type is required")
            .MaximumLength(100);

        RuleFor(x => x.DataBase64)
            .NotEmpty().WithMessage("Data is required");
    }
}

public class UploadFaviconCommandHandler : IRequestHandler<UploadFaviconCommand, UploadFaviconResponse>
{
    private readonly IFaviconBlobRepository _faviconBlobRepository;

    public UploadFaviconCommandHandler(IFaviconBlobRepository faviconBlobRepository)
    {
        _faviconBlobRepository = faviconBlobRepository;
    }

    public async Task<UploadFaviconResponse> Handle(UploadFaviconCommand request, CancellationToken cancellationToken)
    {
        var normalizedHash = request.Hash.ToLowerInvariant();

        if (await _faviconBlobRepository.ExistsAsync(normalizedHash, cancellationToken))
        {
            return new UploadFaviconResponse { Hash = normalizedHash, AlreadyExisted = true };
        }

        byte[] data;
        try
        {
            data = Convert.FromBase64String(request.DataBase64);
        }
        catch (FormatException ex)
        {
            throw new ArgumentException("DataBase64 is not valid base64.", nameof(request), ex);
        }

        var faviconBlob = FaviconBlob.Create(normalizedHash, request.ContentType, data);

        // CreateIfNotExistsAsync itself absorbs the rare race where two devices independently discover and
        // upload the same new favicon at nearly the same moment (both pass ExistsAsync above
        // before either has committed) - see FaviconBlobRepository for why that's handled there
        // rather than here, which would need an EF Core dependency this layer doesn't have.
        var alreadyExisted = await _faviconBlobRepository.CreateIfNotExistsAsync(faviconBlob, cancellationToken);

        return new UploadFaviconResponse { Hash = normalizedHash, AlreadyExisted = alreadyExisted };
    }
}
