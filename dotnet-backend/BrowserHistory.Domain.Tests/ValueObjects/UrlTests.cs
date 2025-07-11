using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;

namespace BrowserHistory.Domain.Tests.ValueObjects;

public class UrlTests
{
    [Theory]
    [InlineData("https://example.com")]
    [InlineData("http://example.com")]
    [InlineData("https://subdomain.example.com/path")]
    [InlineData("https://example.com:8080/path?query=value")]
    public void From_WithValidUrls_ShouldCreateUrl(string validUrl)
    {
        // Act
        var url = Url.From(validUrl);

        // Assert
        url.Value.Should().NotBeNullOrEmpty();
        url.ToUri().Should().NotBeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("not-a-url")]
    [InlineData("ftp://example.com")]
    [InlineData("file:///path/to/file")]
    public void From_WithInvalidUrls_ShouldThrowArgumentException(string invalidUrl)
    {
        // Act & Assert
        var act = () => Url.From(invalidUrl);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void From_WithNullString_ShouldThrowArgumentException()
    {
        // Act & Assert
        var act = () => Url.From((string)null!);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void From_WithUri_ShouldCreateUrl()
    {
        // Arrange
        var uri = new Uri("https://example.com/path");

        // Act
        var url = Url.From(uri);

        // Assert
        url.Value.Should().Be("https://example.com/path");
        url.ToUri().Should().Be(uri);
    }

    [Fact]
    public void From_WithNullUri_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        var act = () => Url.From((Uri)null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Normalization_ShouldRemoveFragment()
    {
        // Arrange
        var urlWithFragment = "https://example.com/path#fragment";

        // Act
        var url = Url.From(urlWithFragment);

        // Assert
        url.Value.Should().Be("https://example.com/path");
    }

    [Fact]
    public void Normalization_ShouldRemoveTrailingSlash()
    {
        // Arrange
        var urlWithTrailingSlash = "https://example.com/path/";

        // Act
        var url = Url.From(urlWithTrailingSlash);

        // Assert
        url.Value.Should().Be("https://example.com/path");
    }

    [Fact]
    public void Normalization_ShouldKeepRootSlash()
    {
        // Arrange
        var rootUrl = "https://example.com/";

        // Act
        var url = Url.From(rootUrl);

        // Assert
        url.Value.Should().Be("https://example.com/");
    }

    [Fact]
    public void ToString_ShouldReturnUrlString()
    {
        // Arrange
        var urlString = "https://example.com/path";
        var url = Url.From(urlString);

        // Act
        var result = url.ToString();

        // Assert
        result.Should().Be(urlString);
    }

    [Fact]
    public void ImplicitConversion_ToString_ShouldWork()
    {
        // Arrange
        var urlString = "https://example.com/path";
        var url = Url.From(urlString);

        // Act
        string convertedString = url;

        // Assert
        convertedString.Should().Be(urlString);
    }

    [Fact]
    public void ExplicitConversion_FromString_ShouldWork()
    {
        // Arrange
        var urlString = "https://example.com/path";

        // Act
        var url = (Url)urlString;

        // Assert
        url.Value.Should().Be(urlString);
    }

    [Fact]
    public void ExplicitConversion_FromUri_ShouldWork()
    {
        // Arrange
        var uri = new Uri("https://example.com/path");

        // Act
        var url = (Url)uri;

        // Assert
        url.Value.Should().Be("https://example.com/path");
    }

    [Fact]
    public void Equality_ShouldWorkCorrectly()
    {
        // Arrange
        var urlString = "https://example.com/path";
        var url1 = Url.From(urlString);
        var url2 = Url.From(urlString);
        var url3 = Url.From("https://different.com");

        // Assert
        url1.Should().Be(url2);
        url1.Should().NotBe(url3);
        (url1 == url2).Should().BeTrue();
        (url1 != url3).Should().BeTrue();
    }
}
