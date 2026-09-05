using System.Numerics;

namespace RadicalSimplifier;

public readonly record struct Rational : IComparable<Rational>
{
    public BigInteger Numerator { get; }
    public BigInteger Denominator { get; }

    public Rational(BigInteger numerator)
        : this(numerator, BigInteger.One)
    {
    }

    public Rational(BigInteger numerator, BigInteger denominator)
    {
        if (denominator == 0)
        {
            throw new DivideByZeroException();
        }

        if (denominator < 0)
        {
            numerator = -numerator;
            denominator = -denominator;
        }

        var gcd = BigInteger.GreatestCommonDivisor(BigInteger.Abs(numerator), denominator);
        Numerator = numerator / gcd;
        Denominator = denominator / gcd;
    }

    public static implicit operator Rational(int value) => new(value);
    public static implicit operator Rational(BigInteger value) => new(value);

    public static Rational operator +(Rational left, Rational right) =>
        new(left.Numerator * right.Denominator + right.Numerator * left.Denominator,
            left.Denominator * right.Denominator);

    public static Rational operator -(Rational left, Rational right) =>
        new(left.Numerator * right.Denominator - right.Numerator * left.Denominator,
            left.Denominator * right.Denominator);

    public static Rational operator -(Rational value) => new(-value.Numerator, value.Denominator);

    public static Rational operator *(Rational left, Rational right) =>
        new(left.Numerator * right.Numerator, left.Denominator * right.Denominator);

    public static Rational operator /(Rational left, Rational right) =>
        new(left.Numerator * right.Denominator, left.Denominator * right.Numerator);

    public static bool operator <(Rational left, Rational right) => left.CompareTo(right) < 0;
    public static bool operator >(Rational left, Rational right) => left.CompareTo(right) > 0;
    public static bool operator <=(Rational left, Rational right) => left.CompareTo(right) <= 0;
    public static bool operator >=(Rational left, Rational right) => left.CompareTo(right) >= 0;

    public bool IsZero => Numerator.IsZero;
    public bool IsInteger => Denominator.IsOne;

    public int CompareTo(Rational other) =>
        (Numerator * other.Denominator).CompareTo(other.Numerator * Denominator);

    public override string ToString() =>
        IsInteger ? Numerator.ToString() : $"{Numerator}/{Denominator}";

    public static bool TrySquareRoot(Rational value, out Rational root)
    {
        root = default;
        if (value.Numerator < 0)
        {
            return false;
        }

        if (!IntegerMath.TryPerfectPower(value.Numerator, 2, out var numeratorRoot) ||
            !IntegerMath.TryPerfectPower(value.Denominator, 2, out var denominatorRoot))
        {
            return false;
        }

        root = new Rational(numeratorRoot, denominatorRoot);
        return true;
    }
}
