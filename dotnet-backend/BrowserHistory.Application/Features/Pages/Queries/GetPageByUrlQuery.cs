using BrowserHistory.Application.Features.Pages.Models;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Repositories;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Pages.Queries;

/// <summary>
/// Query to get a specific page by URL
/// </summary>
public sealed record GetPageByUrlQuery : IRequest<PageDto?>
{
    public required string Url { get; init; }
}

/// <summary>
/// Validator for GetPageByUrlQuery
/// </summary>
public sealed class GetPageByUrlQueryValidator : AbstractValidator<GetPageByUrlQuery>
{
    public GetPageByUrlQueryValidator()
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
/// Handler for GetPageByUrlQuery
/// </summary>
public sealed class GetPageByUrlQueryHandler : IRequestHandler<GetPageByUrlQuery, PageDto?>
{
    private readonly IPageRepository _pageRepository;

    public GetPageByUrlQueryHandler(IPageRepository pageRepository)
    {
        _pageRepository = pageRepository;
    }

    public async Task<PageDto?> Handle(GetPageByUrlQuery request, CancellationToken cancellationToken)
    {
        var url = Url.Create(request.Url);
        var page = await _pageRepository.GetByUrlAsync(url, cancellationToken);
        
        return page is null ? null : MapToDto(page);
    }

    private static PageDto MapToDto(Page page)
    {
        return new PageDto
        {
            Id = page.Id,
            Url = page.Url.Value,
            Title = page.Title,
            Description = page.Description,
            Content = page.Content,
            FaviconUrl = page.FaviconUrl,
            Language = page.Language,
            Keywords = page.Keywords,
            LastIndexedAt = page.LastIndexedAt,
            CreatedAt = page.CreatedAt,
            UpdatedAt = page.UpdatedAt,
            ContentLength = (int)page.ContentLength,
            ContentType = page.ContentType,
            StatusCode = page.StatusCode,
            IsStale = page.IsContentStale(TimeSpan.FromDays(30)),
            Summary = page.GetSummary()
        };
    }
}
