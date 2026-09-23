using System.Security.Cryptography;
using System.Text;
using BrowserHistory.Domain.Entities;
using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;

namespace BrowserHistory.Domain.Tests.Entities;

public class FaviconBlobTests
{
    private static (byte[] Data, string Hash) SampleContent()
    {
        var data = Encoding.UTF8.GetBytes("fake-favicon-bytes");
        var hash = Checksum.FromBytes(data).Value;
        return (data, hash);
    }

    [Fact]
    public void Create_WithMatchingHash_ShouldCreateFaviconBlob()
    {
        var (data, hash) = SampleContent();

        var blob = FaviconBlob.Create(hash, "image/png", data);

        blob.Hash.Should().Be(hash);
        blob.ContentType.Should().Be("image/png");
        blob.Data.Should().BeEquivalentTo(data);
        blob.SizeBytes.Should().Be(data.Length);
        blob.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void Create_NormalizesHashCasing()
    {
        var (data, hash) = SampleContent();

        var blob = FaviconBlob.Create(hash.ToUpperInvariant(), "image/png", data);

        blob.Hash.Should().Be(hash.ToLowerInvariant());
    }

    [Fact]
    public void Create_WithHashNotMatchingContent_ShouldThrow()
    {
        var (data, _) = SampleContent();
        var wrongHash = Checksum.FromBytes(Encoding.UTF8.GetBytes("different-content")).Value;

        var act = () => FaviconBlob.Create(wrongHash, "image/png", data);

        act.Should().Throw<ArgumentException>()
            .WithMessage("*does not match*");
    }

    [Fact]
    public void Create_WithMalformedHash_ShouldThrow()
    {
        var (data, _) = SampleContent();

        var act = () => FaviconBlob.Create("not-a-real-hash", "image/png", data);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithEmptyData_ShouldThrow()
    {
        var emptyHash = Checksum.FromBytes(Array.Empty<byte>()).Value;

        var act = () => FaviconBlob.Create(emptyHash, "image/png", Array.Empty<byte>());

        act.Should().Throw<ArgumentException>()
            .WithMessage("*cannot be null or empty*");
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public void Create_WithEmptyContentType_ShouldThrow(string contentType)
    {
        var (data, hash) = SampleContent();

        var act = () => FaviconBlob.Create(hash, contentType, data);

        act.Should().Throw<ArgumentException>();
    }
}
