using BrowserHistory.Domain.ValueObjects;
using FluentAssertions;

namespace BrowserHistory.Domain.Tests.ValueObjects;

public class ChecksumTests
{
    [Fact]
    public void FromString_WithValidHex_ShouldCreateChecksum()
    {
        // Arrange
        const string validHex = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

        // Act
        var checksum = Checksum.FromString(validHex);

        // Assert
        checksum.Value.Should().Be(validHex);
    }

    [Fact]
    public void FromString_WithMixedCase_ShouldNormalizeToLowercase()
    {
        // Arrange
        const string mixedCaseHex = "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855";
        const string expectedLower = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

        // Act
        var checksum = Checksum.FromString(mixedCaseHex);

        // Assert
        checksum.Value.Should().Be(expectedLower);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public void FromString_WithInvalidInput_ShouldThrowArgumentException(string invalidHex)
    {
        // Act & Assert
        var act = () => Checksum.FromString(invalidHex);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void FromString_WithNullInput_ShouldThrowArgumentException()
    {
        // Act & Assert
        var act = () => Checksum.FromString(null!);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void FromString_WithInvalidLength_ShouldThrowArgumentException()
    {
        // Arrange
        const string shortHex = "abc123";

        // Act & Assert
        var act = () => Checksum.FromString(shortHex);
        act.Should().Throw<ArgumentException>()
            .WithMessage("*64 characters long*");
    }

    [Fact]
    public void FromString_WithNonHexCharacters_ShouldThrowArgumentException()
    {
        // Arrange
        const string invalidHex = "g3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

        // Act & Assert
        var act = () => Checksum.FromString(invalidHex);
        act.Should().Throw<ArgumentException>()
            .WithMessage("*hexadecimal characters*");
    }

    [Fact]
    public void FromContent_WithEmptyString_ShouldReturnEmptyStringHash()
    {
        // Arrange
        const string content = "";
        const string expectedHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // SHA-256 of empty string

        // Act
        var checksum = Checksum.FromContent(content);

        // Assert
        checksum.Value.Should().Be(expectedHash);
    }

    [Fact]
    public void FromContent_WithSimpleString_ShouldReturnCorrectHash()
    {
        // Arrange
        const string content = "hello";
        const string expectedHash = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"; // SHA-256 of "hello"

        // Act
        var checksum = Checksum.FromContent(content);

        // Assert
        checksum.Value.Should().Be(expectedHash);
    }

    [Fact]
    public void FromContent_WithNullContent_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        var act = () => Checksum.FromContent(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void FromBytes_WithValidBytes_ShouldReturnCorrectHash()
    {
        // Arrange
        var bytes = new byte[] { 0x68, 0x65, 0x6c, 0x6c, 0x6f }; // "hello" in bytes
        const string expectedHash = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

        // Act
        var checksum = Checksum.FromBytes(bytes);

        // Assert
        checksum.Value.Should().Be(expectedHash);
    }

    [Fact]
    public void FromBytes_WithNullBytes_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        var act = () => Checksum.FromBytes(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void VerifyContent_WithMatchingContent_ShouldReturnTrue()
    {
        // Arrange
        const string content = "test content";
        var checksum = Checksum.FromContent(content);

        // Act
        var result = checksum.VerifyContent(content);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void VerifyContent_WithDifferentContent_ShouldReturnFalse()
    {
        // Arrange
        const string originalContent = "test content";
        const string differentContent = "different content";
        var checksum = Checksum.FromContent(originalContent);

        // Act
        var result = checksum.VerifyContent(differentContent);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void VerifyContent_WithNullContent_ShouldThrowArgumentNullException()
    {
        // Arrange
        var checksum = Checksum.FromContent("test");

        // Act & Assert
        var act = () => checksum.VerifyContent(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void VerifyBytes_WithMatchingBytes_ShouldReturnTrue()
    {
        // Arrange
        var bytes = new byte[] { 0x01, 0x02, 0x03 };
        var checksum = Checksum.FromBytes(bytes);

        // Act
        var result = checksum.VerifyBytes(bytes);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void VerifyBytes_WithDifferentBytes_ShouldReturnFalse()
    {
        // Arrange
        var originalBytes = new byte[] { 0x01, 0x02, 0x03 };
        var differentBytes = new byte[] { 0x04, 0x05, 0x06 };
        var checksum = Checksum.FromBytes(originalBytes);

        // Act
        var result = checksum.VerifyBytes(differentBytes);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void VerifyBytes_WithNullBytes_ShouldThrowArgumentNullException()
    {
        // Arrange
        var checksum = Checksum.FromBytes(new byte[] { 0x01 });

        // Act & Assert
        var act = () => checksum.VerifyBytes(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void ToString_ShouldReturnValue()
    {
        // Arrange
        const string hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        var checksum = Checksum.FromString(hash);

        // Act
        var result = checksum.ToString();

        // Assert
        result.Should().Be(hash);
    }

    [Fact]
    public void ImplicitConversion_ToString_ShouldReturnValue()
    {
        // Arrange
        const string hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        var checksum = Checksum.FromString(hash);

        // Act
        string result = checksum;

        // Assert
        result.Should().Be(hash);
    }

    [Fact]
    public void Equality_WithSameHash_ShouldBeEqual()
    {
        // Arrange
        const string hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        var checksum1 = Checksum.FromString(hash);
        var checksum2 = Checksum.FromString(hash);

        // Act & Assert
        checksum1.Should().Be(checksum2);
        (checksum1 == checksum2).Should().BeTrue();
        (checksum1 != checksum2).Should().BeFalse();
    }

    [Fact]
    public void Equality_WithDifferentHash_ShouldNotBeEqual()
    {
        // Arrange
        const string hash1 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        const string hash2 = "2cf24dba4f21d4288094e9b259bdb1b67c87c9b7b18ef6bb6abb6f5e72c2e568";
        var checksum1 = Checksum.FromString(hash1);
        var checksum2 = Checksum.FromString(hash2);

        // Act & Assert
        checksum1.Should().NotBe(checksum2);
        (checksum1 == checksum2).Should().BeFalse();
        (checksum1 != checksum2).Should().BeTrue();
    }

    [Fact]
    public void GetHashCode_WithSameValue_ShouldReturnSameHashCode()
    {
        // Arrange
        const string hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        var checksum1 = Checksum.FromString(hash);
        var checksum2 = Checksum.FromString(hash);

        // Act & Assert
        checksum1.GetHashCode().Should().Be(checksum2.GetHashCode());
    }

    [Fact]
    public void FromContent_DifferentContentSameCasing_ShouldProduceDifferentHashes()
    {
        // Arrange
        const string content1 = "Hello World";
        const string content2 = "hello world";

        // Act
        var checksum1 = Checksum.FromContent(content1);
        var checksum2 = Checksum.FromContent(content2);

        // Assert
        checksum1.Should().NotBe(checksum2);
    }

    [Fact]
    public void FromContent_SameContentMultipleTimes_ShouldProduceSameHash()
    {
        // Arrange
        const string content = "consistent content";

        // Act
        var checksum1 = Checksum.FromContent(content);
        var checksum2 = Checksum.FromContent(content);
        var checksum3 = Checksum.FromContent(content);

        // Assert
        checksum1.Should().Be(checksum2);
        checksum2.Should().Be(checksum3);
        checksum1.Should().Be(checksum3);
    }
}
