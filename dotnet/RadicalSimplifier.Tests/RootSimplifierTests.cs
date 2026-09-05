using System.Numerics;
using RadicalSimplifier;

namespace RadicalSimplifier.Tests;

public class RootSimplifierTests
{
    [Theory]
    [InlineData(2, 72, 6, 2)]
    [InlineData(3, 108, 3, 4)]
    [InlineData(4, 80, 2, 5)]
    [InlineData(5, 32, 2, 1)]
    public void SimplifyExtractsPerfectPowers(
        int degree,
        int radicand,
        int expectedOutside,
        int expectedInside)
    {
        var result = RootSimplifier.Simplify(degree, radicand);

        Assert.Equal(expectedOutside, result.Outside);
        Assert.Equal(expectedInside, result.Inside);
    }

    [Fact]
    public void SimplifySupportsNegativeOddRoots()
    {
        var result = RootSimplifier.Simplify(3, -108);

        Assert.Equal(-3, result.Outside);
        Assert.Equal(4, result.Inside);
        Assert.Equal("-3√[3](4)", result.ToString());
    }

    [Fact]
    public void SimplifyRejectsNegativeEvenRoots()
    {
        Assert.Throws<ArgumentException>(() => RootSimplifier.Simplify(2, -4));
    }

    [Fact]
    public void SimplifyHandlesZeroAndOne()
    {
        Assert.Equal("0", RootSimplifier.Simplify(2, 0).ToString());
        Assert.Equal("1", RootSimplifier.Simplify(7, 1).ToString());
    }

    [Fact]
    public void SimplifyUsesBigInteger()
    {
        var value = BigInteger.Pow(2, 80) * 3;
        var result = RootSimplifier.Simplify(2, value);

        Assert.Equal(BigInteger.Pow(2, 40), result.Outside);
        Assert.Equal(3, result.Inside);
    }
}
