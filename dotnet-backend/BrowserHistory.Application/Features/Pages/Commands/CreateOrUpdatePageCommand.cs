using BrowserHistory.Application.Features.Pages.Models;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.Repositories;
using BrowserHistory.Domain.ValueObjects;
using FluentValidation;
using MediatR;

namespace BrowserHistory.Application.Features.Pages.Commands;

/// <summary>
/// Command to create or update a page
/// </summary>
public sealed record CreateOrUpdatePageCommand : IRequest<PageResponse>
{
    public required string Url { get; init; }
    public required string Title { get; init; }
    public string? Description { get; init; }
    public string? Content { get; init; }
    public string? FaviconUrl { get; init; }
    public string? Language { get; init; }
    public string? Keywords { get; init; }
    public string? ContentType { get; init; }
    public int? StatusCode { get; init; }
}

/// <summary>
/// Validator for CreateOrUpdatePageCommand
/// </summary>
public sealed class CreateOrUpdatePageCommandValidator : AbstractValidator<CreateOrUpdatePageCommand>
{
    public CreateOrUpdatePageCommandValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty()
            .WithMessage("URL is required")
            .MaximumLength(2000)
            .WithMessage("URL cannot exceed 2000 characters")
            .Must(BeValidUrl)
            .WithMessage("URL must be a valid HTTP or HTTPS URL");

        RuleFor(x => x.Title)
            .NotEmpty()
            .WithMessage("Title is required")
            .MaximumLength(1000)
            .WithMessage("Title cannot exceed 1000 characters");

        RuleFor(x => x.Description)
            .MaximumLength(2000)
            .WithMessage("Description cannot exceed 2000 characters")
            .When(x => x.Description is not null);

        RuleFor(x => x.FaviconUrl)
            .MaximumLength(500)
            .WithMessage("Favicon URL cannot exceed 500 characters")
            .When(x => x.FaviconUrl is not null);

        RuleFor(x => x.Language)
            .MaximumLength(10)
            .WithMessage("Language cannot exceed 10 characters")
            .When(x => x.Language is not null);

        RuleFor(x => x.Keywords)
            .MaximumLength(2000)
            .WithMessage("Keywords cannot exceed 2000 characters")
            .When(x => x.Keywords is not null);

        RuleFor(x => x.ContentType)
            .MaximumLength(100)
            .WithMessage("Content type cannot exceed 100 characters")
            .When(x => x.ContentType is not null);

        RuleFor(x => x.StatusCode)
            .InclusiveBetween(100, 599)
            .WithMessage("Status code must be between 100 and 599")
            .When(x => x.StatusCode.HasValue);
    }

    private static bool BeValidUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var result) &&
               (result.Scheme == Uri.UriSchemeHttp || result.Scheme == Uri.UriSchemeHttps);
    }
}

/// <summary>
/// Handler for CreateOrUpdatePageCommand
/// </summary>
public sealed class CreateOrUpdatePageCommandHandler : IRequestHandler<CreateOrUpdatePageCommand, PageResponse>
{
    private readonly IPageRepository _pageRepository;

    public CreateOrUpdatePageCommandHandler(IPageRepository pageRepository)
    {
        _pageRepository = pageRepository;
    }

    public async Task<PageResponse> Handle(CreateOrUpdatePageCommand request, CancellationToken cancellationToken)
    {
        var url = Url.Create(request.Url);
        
        // Try to find existing page
        var existingPage = await _pageRepository.GetByUrlAsync(url, cancellationToken);
        
        bool wasCreated;
        Page page;

        if (existingPage is null)
        {
            // Create new page
            page = Page.Create(url, request.Title);
            
            // Set additional properties if provided
            if (request.Description is not null)
                page.UpdateDescription(request.Description);
            
            if (request.Content is not null)
                page.UpdateContent(request.Content, request.ContentType);
            
            if (request.FaviconUrl is not null)
                page.SetFavicon(request.FaviconUrl);
            
            if (request.Language is not null)
                page.SetLanguage(request.Language);
            
            if (request.Keywords is not null)
                page.SetKeywords(request.Keywords);
            
            if (request.StatusCode.HasValue)
                page.SetHttpStatus(request.StatusCode.Value);

            await _pageRepository.AddAsync(page, cancellationToken);
            wasCreated = true;
        }
        else
        {
            // Update existing page
            existingPage.UpdateTitle(request.Title);
            
            if (request.Description is not null)
                existingPage.UpdateDescription(request.Description);
            
            if (request.Content is not null)
                existingPage.UpdateContent(request.Content, request.ContentType);
            
            if (request.FaviconUrl is not null)
                existingPage.SetFavicon(request.FaviconUrl);
            
            if (request.Language is not null)
                existingPage.SetLanguage(request.Language);
            
            if (request.Keywords is not null)
                existingPage.SetKeywords(request.Keywords);

            existingPage.MarkAsIndexed();

            await _pageRepository.UpdateAsync(existingPage, cancellationToken);
            page = existingPage;
            wasCreated = false;
        }

        var pageDto = MapToDto(page);
        
        return new PageResponse
        {
            Page = pageDto,
            WasCreated = wasCreated,
            Message = wasCreated ? "Page created successfully" : "Page updated successfully"
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
