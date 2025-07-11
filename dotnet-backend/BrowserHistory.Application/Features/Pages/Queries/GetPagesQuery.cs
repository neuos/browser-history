using BrowserHistory.Application.Features.Pages.Models;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Repositories;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Pages.Queries;

/// <summary>
/// Query to get pages with filtering and pagination
/// </summary>
public sealed record GetPagesQuery : IRequest<GetPagesResponse>
{
    public string? SearchTerm { get; init; }
    public string? Language { get; init; }
    public bool? OnlyStale { get; init; }
    public bool? OnlyLarge { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? SortBy { get; init; } = "UpdatedAt";
    public bool SortDescending { get; init; } = true;
}

/// <summary>
/// Validator for GetPagesQuery
/// </summary>
public sealed class GetPagesQueryValidator : AbstractValidator<GetPagesQuery>
{
    public GetPagesQueryValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThan(0)
            .WithMessage("Page must be greater than 0");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Page size must be between 1 and 100");

        RuleFor(x => x.SearchTerm)
            .MaximumLength(500)
            .WithMessage("Search term cannot exceed 500 characters")
            .When(x => x.SearchTerm is not null);

        RuleFor(x => x.Language)
            .MaximumLength(10)
            .WithMessage("Language cannot exceed 10 characters")
            .When(x => x.Language is not null);

        RuleFor(x => x.SortBy)
            .Must(BeValidSortField)
            .WithMessage("Invalid sort field. Valid fields are: UpdatedAt, CreatedAt, Title, ContentLength, LastIndexedAt")
            .When(x => x.SortBy is not null);
    }

    private static bool BeValidSortField(string? sortBy)
    {
        if (sortBy is null) return true;
        
        var validFields = new[] { "UpdatedAt", "CreatedAt", "Title", "ContentLength", "LastIndexedAt" };
        return validFields.Contains(sortBy, StringComparer.OrdinalIgnoreCase);
    }
}

/// <summary>
/// Handler for GetPagesQuery
/// </summary>
public sealed class GetPagesQueryHandler : IRequestHandler<GetPagesQuery, GetPagesResponse>
{
    private readonly IPageRepository _pageRepository;

    public GetPagesQueryHandler(IPageRepository pageRepository)
    {
        _pageRepository = pageRepository;
    }

    public async Task<GetPagesResponse> Handle(GetPagesQuery request, CancellationToken cancellationToken)
    {
        // Get pages based on filters
        IEnumerable<Page> pages;
        int totalCount;

        if (!string.IsNullOrWhiteSpace(request.SearchTerm) || !string.IsNullOrWhiteSpace(request.Language) || request.OnlyStale == true)
        {
            // Use the SearchAsync method with appropriate filters
            var searchResults = await _pageRepository.SearchAsync(
                searchTerm: request.SearchTerm,
                language: request.Language,
                indexedAfter: request.OnlyStale == true ? DateTime.UtcNow.AddDays(-30) : null,
                skip: (request.Page - 1) * request.PageSize,
                take: request.PageSize,
                cancellationToken);
            
            pages = searchResults;
            totalCount = pages.Count(); // This is an approximation for pagination
        }
        else if (request.OnlyLarge == true)
        {
            // Get large pages (>1MB content)
            var largePages = await _pageRepository.GetLargePagesAsync(
                1024 * 1024, 
                request.PageSize,
                cancellationToken);
            
            pages = largePages.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize);
            totalCount = largePages.Count();
        }
        else
        {
            // Get all pages using search with no filters
            var allPages = await _pageRepository.SearchAsync(
                searchTerm: null,
                language: null,
                indexedAfter: null,
                skip: (request.Page - 1) * request.PageSize,
                take: request.PageSize,
                cancellationToken);
            
            totalCount = await _pageRepository.GetCountAsync(cancellationToken);
            pages = allPages;
        }

        // Apply sorting to the results
        var sortedPages = ApplySorting(pages, request.SortBy, request.SortDescending);
        var pageDtos = sortedPages.Select(MapToDto).ToList();
        var totalPages = (int)Math.Ceiling((double)totalCount / request.PageSize);

        return new GetPagesResponse
        {
            Pages = pageDtos,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalPages = totalPages,
            HasNext = request.Page < totalPages,
            HasPrevious = request.Page > 1
        };
    }

    private static IEnumerable<Page> ApplySorting(IEnumerable<Page> pages, string? sortBy, bool sortDescending)
    {
        return (sortBy?.ToLowerInvariant()) switch
        {
            "createdat" => sortDescending 
                ? pages.OrderByDescending(p => p.CreatedAt)
                : pages.OrderBy(p => p.CreatedAt),
            "title" => sortDescending 
                ? pages.OrderByDescending(p => p.Title)
                : pages.OrderBy(p => p.Title),
            "contentlength" => sortDescending 
                ? pages.OrderByDescending(p => p.ContentLength)
                : pages.OrderBy(p => p.ContentLength),
            "lastindexedat" => sortDescending 
                ? pages.OrderByDescending(p => p.LastIndexedAt)
                : pages.OrderBy(p => p.LastIndexedAt),
            _ => sortDescending 
                ? pages.OrderByDescending(p => p.UpdatedAt)
                : pages.OrderBy(p => p.UpdatedAt)
        };
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
