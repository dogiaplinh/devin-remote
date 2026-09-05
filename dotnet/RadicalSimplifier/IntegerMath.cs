using System.Numerics;

namespace RadicalSimplifier;

internal static class IntegerMath
{
    public static bool TryPerfectPower(BigInteger value, int degree, out BigInteger root)
    {
        root = 0;
        if (degree < 1 || value < 0)
        {
            return false;
        }

        if (value == 0 || value == 1)
        {
            root = value;
            return true;
        }

        var low = BigInteger.Zero;
        var high = BigInteger.One;
        while (BigInteger.Pow(high, degree) < value)
        {
            high *= 2;
        }

        while (low <= high)
        {
            var middle = (low + high) / 2;
            var power = BigInteger.Pow(middle, degree);
            if (power == value)
            {
                root = middle;
                return true;
            }

            if (power < value)
            {
                low = middle + 1;
            }
            else
            {
                high = middle - 1;
            }
        }

        return false;
    }

    public static IEnumerable<(BigInteger Prime, int Exponent)> Factorize(BigInteger value)
    {
        if (value < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(value));
        }

        var remaining = value;
        var exponent = 0;
        while (remaining % 2 == 0)
        {
            remaining /= 2;
            exponent++;
        }

        if (exponent > 0)
        {
            yield return (2, exponent);
        }

        for (var factor = new BigInteger(3); factor * factor <= remaining; factor += 2)
        {
            exponent = 0;
            while (remaining % factor == 0)
            {
                remaining /= factor;
                exponent++;
            }

            if (exponent > 0)
            {
                yield return (factor, exponent);
            }
        }

        if (remaining > 1)
        {
            yield return (remaining, 1);
        }
    }
}
