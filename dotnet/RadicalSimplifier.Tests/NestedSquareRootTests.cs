using RadicalSimplifier;

namespace RadicalSimplifier.Tests;

public class NestedSquareRootTests
{
    [Fact]
    public void SimplifiesThreePlusTwoRootTwo()
    {
        var success = NestedSquareRootSimplifier.TrySimplify(3, 2, 2, out var result);

        Assert.True(success);
        Assert.Equal("1 + √(2)", result.ToString());
    }

    [Fact]
    public void SimplifiesSevenMinusFourRootThree()
    {
        var success = NestedSquareRootSimplifier.TrySimplify(7, -4, 3, out var result);

        Assert.True(success);
        Assert.Equal("2 - √(3)", result.ToString());
    }

    [Fact]
    public void SimplifiesRationalCoefficients()
    {
        var success = NestedSquareRootSimplifier.TrySimplify(
            new Rational(7, 4),
            new Rational(1, 2),
            6,
            out var result);

        Assert.True(success);
        Assert.Equal("1/2 + 1/2√(6)", result.ToString());
    }

    [Fact]
    public void ReportsWhenNoRationalDecompositionExists()
    {
        var success = NestedSquareRootSimplifier.TrySimplify(2, 1, 2, out _);

        Assert.False(success);
    }

    [Fact]
    public void CombinesPerfectSquareInnerRadicand()
    {
        var success = NestedSquareRootSimplifier.TrySimplify(5, 4, 1, out var result);

        Assert.True(success);
        Assert.Equal("3", result.ToString());
    }

    [Fact]
    public void RejectsNonPositiveInnerRadicand()
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => NestedSquareRootSimplifier.TrySimplify(3, 1, 0, out _));
    }
}
