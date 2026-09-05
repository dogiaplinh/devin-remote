using System.Numerics;

namespace RadicalSimplifier;

public readonly record struct NestedSquareRoot(
    Rational RationalPart,
    Rational RadicalCoefficient,
    BigInteger Radicand)
{
    public override string ToString()
    {
        if (RadicalCoefficient.IsZero)
        {
            return RationalPart.ToString();
        }

        var radical = Radicand == 1
            ? string.Empty
            : $"√({Radicand})";

        string radicalTerm;
        if (RadicalCoefficient.Numerator == 1 && RadicalCoefficient.Denominator == 1)
        {
            radicalTerm = radical;
        }
        else if (RadicalCoefficient.Numerator == -1 && RadicalCoefficient.Denominator == 1)
        {
            radicalTerm = $"-{radical}";
        }
        else if (radical.Length == 0)
        {
            radicalTerm = RadicalCoefficient.ToString();
        }
        else
        {
            radicalTerm = $"{RadicalCoefficient}{radical}";
        }

        if (RationalPart.IsZero)
        {
            return radicalTerm;
        }

        var separator = RadicalCoefficient > 0 ? " + " : " - ";
        var coefficient = RadicalCoefficient > 0
            ? RadicalCoefficient
            : -RadicalCoefficient;
        var positiveRadicalTerm = coefficient == 1 && radical.Length > 0
            ? radical
            : $"{coefficient}{radical}";

        return $"{RationalPart}{separator}{positiveRadicalTerm}";
    }
}

public static class NestedSquareRootSimplifier
{
    public static bool TrySimplify(
        Rational a,
        Rational b,
        BigInteger c,
        out NestedSquareRoot result)
    {
        if (c <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(c), "The inner radicand must be positive.");
        }

        var discriminant = a * a - b * b * c;
        if (!Rational.TrySquareRoot(discriminant, out var sqrtDiscriminant))
        {
            result = default;
            return false;
        }

        var candidates = new[] { (a + sqrtDiscriminant) / 2, (a - sqrtDiscriminant) / 2 };
        Rational x = default;
        foreach (var candidate in candidates)
        {
            if (Rational.TrySquareRoot(candidate, out x) && !x.IsZero)
            {
                break;
            }
        }

        if (x.IsZero)
        {
            result = default;
            return false;
        }

        var y = b / (2 * x);
        var innerRoot = RootSimplifier.Simplify(2, c);
        if (innerRoot.Inside == 1)
        {
            result = new NestedSquareRoot(x + y * innerRoot.Outside, 0, 1);
            return true;
        }

        result = new NestedSquareRoot(x, y * innerRoot.Outside, innerRoot.Inside);
        return true;
    }
}
