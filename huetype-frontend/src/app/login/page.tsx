"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="ht-app min-h-screen flex flex-col">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="bg-ht-white shadow-ht-soft border-b border-ht-surface">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" aria-label="Hue Type">
            <Logo size={36} />
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="/docs.html"
              className="text-sm text-ht-ink/60 hover:text-ht-ink transition-colors duration-200 ease-in-out"
            >
              Docs
            </a>
            <Link
              href="/"
              className="text-sm text-ht-ink/60 hover:text-ht-ink transition-colors duration-200 ease-in-out"
            >
              Home
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Sign-in card ──────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="ht-card-active p-10 flex flex-col items-center text-center bg-ht-white">
            <Logo size={48} className="mb-6" />
            <h1 className="text-3xl font-semibold text-ht-ink tracking-tight mb-2">
              Welcome to Hue Type
            </h1>
            <p className="text-ht-ink/60 text-sm mb-8 max-w-xs">
              Sign in with Google to build colour fonts from your SVG icons.
            </p>

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full ht-btn bg-ht-ink text-ht-white px-6 py-4 hover:opacity-90 transition-opacity duration-200 disabled:opacity-40 disabled:cursor-not-allowed gap-3"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-ht-white border-t-transparent animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <GoogleMark />
                  Continue with Google
                </>
              )}
            </button>

            {error && (
              <p className="mt-5 text-xs text-red-600 max-w-xs">{error}</p>
            )}

            <p className="text-[11px] text-ht-ink/40 mt-8 max-w-xs leading-relaxed">
              By continuing you agree to our{" "}
              <Link href="/privacy" className="underline hover:text-ht-ink">
                Privacy Policy
              </Link>
              . We only read your email, name, and profile picture from Google.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-ht-ink/50">
            New here?{" "}
            <a
              href="/docs.html"
              className="text-ht-ink hover:underline"
            >
              Read the documentation
            </a>{" "}
            to see how it works.
          </p>
        </div>
      </div>
    </main>
  );
}

/** Google "G" mark, rendered inline so we don't need an asset. */
function GoogleMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="18"
      height="18"
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}
