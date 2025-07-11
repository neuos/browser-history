using BrowserHistory.Domain.Repositories;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Pages.Commands;

/// <summary>
/// Command to delete a page by URL
/// </summary>
public sealed record DeletePageCommand : IRequest<bool>
{
    public required string Url { get; init; }
}

/// <summary>
/// Validator for DeletePageCommand
/// </summary>
public sealed class DeletePageCommandValidator : AbstractValidator<DeletePageCommand>
{
    public DeletePageCommandValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty()
            .WithMessage("URL is required")
            .Must(BeValidUrl)
            .WithMessage("URL must be a valid HTTP or HTTPS URL");
    }

    private static bool BeValidUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var result) &&
               (result.Scheme == Uri.UriSchemeHttp || result.Scheme == Uri.UriSchemeHttps);
    }
}

/// <summary>
/// Handler for DeletePageCommand
/// </summary>
public sealed class DeletePageCommandHandler : IRequestHandler<DeletePageCommand, bool>
{
    private readonly IPageRepository _pageRepository;

    public DeletePageCommandHandler(IPageRepository pageRepository)
    {
        _pageRepository = pageRepository;
    }

    public async Task<bool> Handle(DeletePageCommand request, CancellationToken cancellationToken)
    {
        var url = Url.Create(request.Url);
        var page = await _pageRepository.GetByUrlAsync(url, cancellationToken);
        
        if (page is null)
            return false;

        await _pageRepository.DeleteAsync(page.Id, cancellationToken);
        return true;
    }
}
