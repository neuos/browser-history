using System.Text;
using BrowserHistory.Application.Common.Interfaces;
using BrowserHistory.Application.Features.Favicons.Commands;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;
using Moq;

namespace BrowserHistory.Application.Tests.Features.Favicons.Commands;

public class UploadFaviconCommandHandlerTests
{
    private readonly Mock<IFaviconBlobRepository> _faviconBlobRepositoryMock;
    private readonly UploadFaviconCommandHandler _handler;

    public UploadFaviconCommandHandlerTests()
    {
        _faviconBlobRepositoryMock = new Mock<IFaviconBlobRepository>();
        _handler = new UploadFaviconCommandHandler(_faviconBlobRepositoryMock.Object);
    }

    private static (string Hash, string DataBase64) SampleContent()
    {
        var data = Encoding.UTF8.GetBytes("fake-favicon-bytes");
        return (Checksum.FromBytes(data).Value, Convert.ToBase64String(data));
    }

    [Fact]
    public async Task Handle_WithNewHash_ShouldStoreBlobAndReturnAlreadyExistedFalse()
    {
        var (hash, dataBase64) = SampleContent();
        var command = new UploadFaviconCommand { Hash = hash, ContentType = "image/png", DataBase64 = dataBase64 };

        _faviconBlobRepositoryMock.Setup(x => x.ExistsAsync(hash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _faviconBlobRepositoryMock.Setup(x => x.CreateIfNotExistsAsync(It.IsAny<FaviconBlob>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.Hash.Should().Be(hash);
        result.AlreadyExisted.Should().BeFalse();
        _faviconBlobRepositoryMock.Verify(x => x.CreateIfNotExistsAsync(
            It.Is<FaviconBlob>(f => f.Hash == hash && f.ContentType == "image/png"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithAlreadyKnownHash_ShouldSkipCreateAndReturnAlreadyExistedTrue()
    {
        var (hash, dataBase64) = SampleContent();
        var command = new UploadFaviconCommand { Hash = hash, ContentType = "image/png", DataBase64 = dataBase64 };

        _faviconBlobRepositoryMock.Setup(x => x.ExistsAsync(hash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.AlreadyExisted.Should().BeTrue();
        _faviconBlobRepositoryMock.Verify(x => x.CreateIfNotExistsAsync(It.IsAny<FaviconBlob>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_NormalizesHashCasingBeforeChecking()
    {
        var (hash, dataBase64) = SampleContent();
        var command = new UploadFaviconCommand { Hash = hash.ToUpperInvariant(), ContentType = "image/png", DataBase64 = dataBase64 };

        _faviconBlobRepositoryMock.Setup(x => x.ExistsAsync(hash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.Hash.Should().Be(hash);
        _faviconBlobRepositoryMock.Verify(x => x.ExistsAsync(hash, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithInvalidBase64_ShouldThrowArgumentException()
    {
        var (hash, _) = SampleContent();
        var command = new UploadFaviconCommand { Hash = hash, ContentType = "image/png", DataBase64 = "not-valid-base64!!!" };

        _faviconBlobRepositoryMock.Setup(x => x.ExistsAsync(hash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var act = async () => await _handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task Handle_WithHashNotMatchingData_ShouldThrowArgumentException()
    {
        var wrongHash = Checksum.FromBytes(Encoding.UTF8.GetBytes("something-else")).Value;
        var dataBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes("fake-favicon-bytes"));
        var command = new UploadFaviconCommand { Hash = wrongHash, ContentType = "image/png", DataBase64 = dataBase64 };

        _faviconBlobRepositoryMock.Setup(x => x.ExistsAsync(wrongHash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var act = async () => await _handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }
}
