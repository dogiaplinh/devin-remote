using System.Numerics;

namespace RadicalSimplifier;

public readonly record struct SimplifiedRoot(
    int Degree,
    BigInteger Outside,
    BigInteger Inside)
{
    public override string ToString()
    {
        if (Inside == 1)
        {
            return Outside.ToString();
        }

        var radical = Degree == 2
            ? $"√({Inside})"
            : $"√[{Degree}]({Inside})";

        if (Outside == 1)
        {
            return radical;
        }

        if (Outside == -1)
        {
            return $"-{radical}";
        }

        return $"{Outside}{radical}";
    }
}
