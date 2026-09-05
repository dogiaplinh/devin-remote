using System.Numerics;

namespace RadicalSimplifier;

public static class RootSimplifier
{
    public static SimplifiedRoot Simplify(int degree, BigInteger radicand)
    {
        if (degree < 2)
        {
            throw new ArgumentOutOfRangeException(nameof(degree), "The degree must be at least 2.");
        }

        if (radicand == 0)
        {
            return new SimplifiedRoot(degree, 0, 1);
        }

        var sign = BigInteger.One;
        if (radicand < 0)
        {
            if (degree % 2 == 0)
            {
                throw new ArgumentException("An even root of a negative integer is not real.", nameof(radicand));
            }

            sign = -1;
            radicand = BigInteger.Abs(radicand);
        }

        var outside = sign;
        var inside = BigInteger.One;
        foreach (var (prime, exponent) in IntegerMath.Factorize(radicand))
        {
            var outsideExponent = exponent / degree;
            var insideExponent = exponent % degree;
            outside *= BigInteger.Pow(prime, outsideExponent);
            inside *= BigInteger.Pow(prime, insideExponent);
        }

        return new SimplifiedRoot(degree, outside, inside);
    }
}
