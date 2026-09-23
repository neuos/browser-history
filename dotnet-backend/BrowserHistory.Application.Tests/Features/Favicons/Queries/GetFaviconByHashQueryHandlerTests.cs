using System.Text;
using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Favicons.Queries;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Favicons.Queries;

public class GetFaviconByHashQueryHandlerTests
{
    private readonly Mock<IFaviconBlobRepository> _faviconBlobRepositoryMock;
    private readonly GetFaviconByHashQueryHandler _handler;

    public GetFaviconByHashQueryHandlerTests()
    {
        _faviconBlobRepositoryMock = new Mock<IFaviconBlobRepository>();
        _handler = new GetFaviconByHashQueryHandler(_faviconBlobRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_WithKnownHash_ShouldReturnDataAndContentType()
    {
        var data = Encoding.UTF8.GetBytes("fake-favicon-bytes");
        var hash = Checksum.FromBytes(data).Value;
        var blob = FaviconBlob.Create(hash, "image/png", data);

        _faviconBlobRepositoryMock.Setup(x => x.GetByHashAsync(hash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(blob);

        var result = await _handler.Handle(new GetFaviconByHashQuery(hash), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Data.Should().BeEquivalentTo(data);
        result.ContentType.Should().Be("image/png");
    }

    [Fact]
    public async Task Handle_WithUnknownHash_ShouldReturnNull()
    {
        var hash = Checksum.FromBytes(Encoding.UTF8.GetBytes("nothing-stored")).Value;

        _faviconBlobRepositoryMock.Setup(x => x.GetByHashAsync(hash, It.IsAny<CancellationToken>()))
            .ReturnsAsync((FaviconBlob?)null);

        var result = await _handler.Handle(new GetFaviconByHashQuery(hash), CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task Handle_NormalizesHashCasing()
    {
        var data = Encoding.UTF8.GetBytes("fake-favicon-bytes");
        var hash = Checksum.FromBytes(data).Value;
        var blob = FaviconBlob.Create(hash, "image/png", data);

        _faviconBlobRepositoryMock.Setup(x => x.GetByHashAsync(hash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(blob);

        var result = await _handler.Handle(new GetFaviconByHashQuery(hash.ToUpperInvariant()), CancellationToken.None);

        result.Should().NotBeNull();
        _faviconBlobRepositoryMock.Verify(x => x.GetByHashAsync(hash, It.IsAny<CancellationToken>()), Times.Once);
    }
}
