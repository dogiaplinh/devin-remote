# RadicalSimplifier

Thư viện C# dùng số học chính xác (`BigInteger`) để rút gọn:

- Căn bậc `n` của số nguyên, ví dụ `∛108 = 3√[3](4)`.
- Căn lồng dạng `√(a + b√c)` khi kết quả có thể viết thành `x + y√c` với `x`, `y` hữu tỉ.

## Chạy test

```bash
dotnet test RadicalSimplifier.slnx
```

## Ví dụ sử dụng

```csharp
using RadicalSimplifier;

var root = RootSimplifier.Simplify(3, 108);
Console.WriteLine(root); // 3√[3](4)

if (NestedSquareRootSimplifier.TrySimplify(3, 2, 2, out var nested))
{
    Console.WriteLine(nested); // 1 + √(2)
}
```

Nếu căn lồng không có dạng hữu tỉ mong muốn, `TrySimplify` trả về `false` thay vì dùng số thực gần đúng.
