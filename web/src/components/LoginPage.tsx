import { FormEvent, useState } from "react";
import { LockKeyholeIcon } from "lucide-react";
import { DevinLogo } from "./DevinLogo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function LoginPage({
  onLogin,
}: {
  onLogin: (username: string, password: string) => Promise<string | null>;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const message = await onLogin(username, password);
      if (message) setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-8">
          <DevinLogo size={32} className="text-foreground" wordmarkClassName="text-lg" />
          <p className="mt-6 text-sm text-muted-foreground">Sign in to access your local Devin sessions.</p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5 text-sm font-medium">
            Username
            <Input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Password
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              autoFocus
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="h-10 w-full" type="submit" disabled={loading}>
            <LockKeyholeIcon />
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
