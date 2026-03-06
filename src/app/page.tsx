"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mode === "signup" ? name : undefined,
          email,
          password,
          action: mode,
        }),
      });

      if (!res.ok) {
        let msg = "Something went wrong";
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch {
          msg = `Server error (${res.status})`;
        }
        throw new Error(msg);
      }

      const interviewer = await res.json();
      localStorage.setItem("interviewer", JSON.stringify(interviewer));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent text-white text-2xl font-bold mb-4">
            IS
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Interview Scorer
          </h1>
          <p className="text-muted mt-2">
            Hardware Engineering Candidate Assessment
          </p>
        </div>

        <div className="flex gap-1 bg-surface-secondary rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(""); }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              mode === "signin"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              mode === "signup"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-2xl shadow-sm border border-border p-8 space-y-5"
        >
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={mode === "signup"}
                placeholder="Jane Smith"
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jane@company.com"
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">
                Password
              </label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="text-xs text-accent hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder={mode === "signup" ? "Min 6 characters" : "Enter your password"}
              className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            {showForgot && (
              <p className="mt-2 text-xs text-muted bg-surface-secondary border border-border rounded-lg p-3">
                Contact your admin to reset your password.
              </p>
            )}
          </div>

          {error && (
            <p className="text-danger text-sm bg-score-low-bg p-3 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : mode === "signup"
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        <p className="text-center text-muted text-xs mt-6">
          {mode === "signin"
            ? "Don't have an account? Switch to Sign Up above."
            : "Already have an account? Switch to Sign In above."}
        </p>
      </div>
    </div>
  );
}
