"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"google" | "email">("google");

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-2">Hue Type</h1>
        <p className="text-text-secondary text-sm mb-8">
          Multi-colour icon font builder
        </p>

        {mode === "google" ? (
          <>
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Signing in…" : "Continue with Google"}
            </button>
            <button
              onClick={() => setMode("email")}
              className="btn-ghost w-full mt-2 text-xs"
            >
              Use email & password instead
            </button>
          </>
        ) : (
          <form onSubmit={signInWithEmail} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setMode("google")}
              className="btn-ghost w-full text-xs"
            >
              Back to Google sign-in
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-xs text-red-400 text-center">{error}</p>
        )}
      </div>
    </main>
  );
}
