import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Hue Type collects, uses, and protects your data. Plain-English overview followed by the full policy.",
};

const EFFECTIVE_DATE = "17 May 2026";
const CONTACT_EMAIL = "sunny.padiyar@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="ht-app min-h-screen flex flex-col">
      {/* ── Navbar — same as login / landing ───────────────────────────── */}
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
            <Link
              href="/login"
              className="ht-btn bg-ht-ink text-ht-white px-5 py-2.5 text-sm rounded-ht-md hover:opacity-90 transition-opacity duration-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <article className="max-w-[760px] mx-auto w-full px-6 py-16 md:py-20 text-ht-ink">
        <p className="text-xs uppercase tracking-[0.15em] text-ht-ink/50 mb-3">
          Legal
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-ht-ink/60 text-base mb-12">
          Effective {EFFECTIVE_DATE}. Hue Type is an indie product built by
          Sunny Allan (based in India). This policy explains what we collect,
          why, and what control you have over it.
        </p>

        {/* TL;DR card */}
        <section className="ht-card-active bg-ht-white p-6 md:p-8 mb-14 rounded-ht-xl">
          <h2 className="text-lg font-semibold mb-4">
            The short version
          </h2>
          <ul className="space-y-2.5 text-sm text-ht-ink/80 leading-relaxed list-disc pl-5">
            <li>
              We use <strong>Google Sign-In</strong>. We read your email,
              display name, and profile picture from Google — nothing else.
            </li>
            <li>
              We store the <strong>SVGs you upload</strong> and the
              <strong> font files we generate</strong> from them, so you can
              come back and edit them. They&apos;re yours; we never look at
              them, share them, or train models on them.
            </li>
            <li>
              We do not sell your data, and we do not run advertising trackers.
            </li>
            <li>
              You can <strong>delete your account and every project</strong>{" "}
              at any time. We delete everything within 30 days.
            </li>
            <li>
              We use Supabase, Vercel, and Render to host the service. Their
              security and processing terms apply to data routed through them.
            </li>
          </ul>
        </section>

        {/* TOC */}
        <nav aria-label="Privacy policy contents" className="mb-12">
          <h2 className="text-xs uppercase tracking-[0.15em] text-ht-ink/50 mb-4">
            Contents
          </h2>
          <ol className="text-sm space-y-1.5 pl-5 list-decimal marker:text-ht-ink/40">
            <li><a href="#who" className="text-ht-ink hover:underline">Who we are</a></li>
            <li><a href="#data" className="text-ht-ink hover:underline">What we collect</a></li>
            <li><a href="#purposes" className="text-ht-ink hover:underline">Why we collect it</a></li>
            <li><a href="#basis" className="text-ht-ink hover:underline">Legal basis (GDPR)</a></li>
            <li><a href="#sharing" className="text-ht-ink hover:underline">Sub-processors &amp; sharing</a></li>
            <li><a href="#cookies" className="text-ht-ink hover:underline">Cookies &amp; local storage</a></li>
            <li><a href="#retention" className="text-ht-ink hover:underline">How long we keep data</a></li>
            <li><a href="#rights" className="text-ht-ink hover:underline">Your rights</a></li>
            <li><a href="#transfers" className="text-ht-ink hover:underline">International transfers</a></li>
            <li><a href="#security" className="text-ht-ink hover:underline">Security</a></li>
            <li><a href="#children" className="text-ht-ink hover:underline">Children</a></li>
            <li><a href="#changes" className="text-ht-ink hover:underline">Changes to this policy</a></li>
            <li><a href="#contact" className="text-ht-ink hover:underline">Contact</a></li>
          </ol>
        </nav>

        <div className="prose-block">
          {/* 1 */}
          <h2 id="who">1. Who we are</h2>
          <p>
            Hue Type is operated by <strong>Sunny Allan</strong>, an
            independent developer based in India. We are the &ldquo;data
            controller&rdquo; for the personal information described in this
            policy. We can be contacted at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          {/* 2 */}
          <h2 id="data">2. What we collect</h2>
          <p>
            We only collect the data we need to make the product work:
          </p>
          <h3>Account data (via Google Sign-In)</h3>
          <ul>
            <li><strong>Email address</strong> — to identify your account.</li>
            <li><strong>Display name</strong> — to personalise the UI.</li>
            <li><strong>Profile picture URL</strong> — to show your avatar.</li>
            <li><strong>Google account ID</strong> — to match you to your session on return visits.</li>
          </ul>
          <p>
            We <em>do not</em> receive your Google password, contacts,
            calendar, files, location, or any other Google data. The scopes we
            request are <code>openid</code>, <code>email</code>, and{" "}
            <code>profile</code>.
          </p>

          <h3>Content you create</h3>
          <ul>
            <li><strong>SVG files</strong> you upload as icon sources.</li>
            <li><strong>Project metadata</strong> — names, descriptions, palette overrides, font type, build history.</li>
            <li><strong>Generated font files</strong> — the WOFF2, TTF, and SBIX TTF files we build for you.</li>
          </ul>

          <h3>Technical data</h3>
          <ul>
            <li><strong>Session cookies</strong> issued by Supabase to keep you logged in.</li>
            <li>
              <strong>Server logs</strong> — IP address, browser user-agent,
              and the API endpoint hit, kept for up to 30 days for security
              and debugging. These are not linked to your account profile and
              not used for analytics.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> use analytics tools, advertising
            trackers, fingerprinting, or session-replay scripts.
          </p>

          {/* 3 */}
          <h2 id="purposes">3. Why we collect it</h2>
          <ul>
            <li><strong>To provide the service</strong> — store your projects, build fonts, let you download them, sign you in on return visits.</li>
            <li><strong>To enforce limits</strong> — your account&apos;s subscription tier dictates how many projects/glyphs you can build.</li>
            <li><strong>To prevent abuse</strong> — rate-limiting and basic anti-abuse depend on IP / session signals.</li>
            <li><strong>To respond to you</strong> — when you email us for support.</li>
          </ul>
          <p>
            We do not use your data for marketing emails, advertising, or
            model training.
          </p>

          {/* 4 */}
          <h2 id="basis">4. Legal basis (GDPR / UK GDPR)</h2>
          <p>For users in the EU, UK, or other jurisdictions with similar laws:</p>
          <ul>
            <li>
              <strong>Performance of a contract</strong> — to provide the
              service when you create an account and use it.
            </li>
            <li>
              <strong>Legitimate interest</strong> — for server logs, abuse
              prevention, and product security. Balanced against your
              expectations as a user of a SaaS tool.
            </li>
            <li>
              <strong>Consent</strong> — you give consent when you click
              &ldquo;Continue with Google&rdquo; on the sign-in screen. You
              can withdraw consent at any time by deleting your account.
            </li>
          </ul>

          {/* 5 */}
          <h2 id="sharing">5. Sub-processors &amp; sharing</h2>
          <p>
            We do not sell, rent, or share your personal data with third
            parties for their own purposes. We use a small set of
            sub-processors to run the service:
          </p>
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>What they do</th>
                <th>Where data is stored</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase</a></td>
                <td>Authentication, database, file storage for SVGs &amp; fonts</td>
                <td>AWS regions, primarily US / Singapore</td>
              </tr>
              <tr>
                <td><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel</a></td>
                <td>Frontend hosting, edge CDN</td>
                <td>Global edge network</td>
              </tr>
              <tr>
                <td><a href="https://render.com/privacy" target="_blank" rel="noopener noreferrer">Render</a></td>
                <td>Backend (font build pipeline)</td>
                <td>US East (Oregon)</td>
              </tr>
              <tr>
                <td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google</a></td>
                <td>OAuth sign-in (identity only — we never receive your password)</td>
                <td>Google&apos;s global infrastructure</td>
              </tr>
            </tbody>
          </table>
          <p>
            We may also share data when <strong>required by law</strong> (e.g.
            a court order from a jurisdiction we are subject to), but we will
            push back on overreaching requests and notify you where legally
            allowed.
          </p>
          <p>
            If we ever introduce billing, we&apos;ll add a payments
            sub-processor (e.g. Dodo Payments or Paddle) and update this
            policy before activating it. You&apos;ll be notified at sign-in.
          </p>

          {/* 6 */}
          <h2 id="cookies">6. Cookies &amp; local storage</h2>
          <p>We use only the cookies and storage needed for the app to function:</p>
          <ul>
            <li>
              <strong>Supabase auth cookies</strong> — keep you logged in
              across page loads. Essential. Expires when you sign out or
              after ~7 days of inactivity.
            </li>
            <li>
              <strong>LocalStorage</strong> — your auth session token (managed
              by Supabase&apos;s SDK) and minor UI preferences (preview size,
              background colour).
            </li>
          </ul>
          <p>
            No third-party advertising or analytics cookies. No tracking
            pixels. There is nothing to opt out of — disabling our cookies
            simply signs you out.
          </p>

          {/* 7 */}
          <h2 id="retention">7. How long we keep data</h2>
          <ul>
            <li>
              <strong>Account &amp; project data</strong> — kept while your
              account is active. If you delete a project, the SVGs and built
              font files are removed from storage immediately. If you delete
              your account, everything is removed within <strong>30 days</strong>.
            </li>
            <li>
              <strong>Server logs</strong> — rotated automatically after 30 days.
            </li>
            <li>
              <strong>Inactive accounts</strong> — if you don&apos;t sign in
              for 24 months, we may email you a warning and then delete the
              account after a further 30 days.
            </li>
          </ul>

          {/* 8 */}
          <h2 id="rights">8. Your rights</h2>
          <p>Depending on where you live, you have rights to:</p>
          <ul>
            <li><strong>Access</strong> a copy of your data.</li>
            <li><strong>Correct</strong> any inaccurate data.</li>
            <li><strong>Delete</strong> your account and data (the dashboard has a delete-project button; for full-account deletion email us).</li>
            <li><strong>Port</strong> your data — we&apos;ll export your projects and built fonts on request.</li>
            <li><strong>Object</strong> to certain processing, or restrict it.</li>
            <li><strong>Withdraw consent</strong> at any time.</li>
            <li><strong>Lodge a complaint</strong> with a supervisory authority (your local data-protection regulator).</li>
          </ul>
          <p>
            To exercise any of these, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            We&apos;ll respond within 30 days.
          </p>

          {/* 9 */}
          <h2 id="transfers">9. International data transfers</h2>
          <p>
            We are based in <strong>India</strong>; our infrastructure
            providers are primarily in the <strong>US</strong>. When you use
            Hue Type, data is transferred across borders.
          </p>
          <p>
            For users in the EU/UK: where our sub-processors transfer data
            outside the EEA/UK, they rely on the European Commission&apos;s{" "}
            <a href="https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en" target="_blank" rel="noopener noreferrer">Standard Contractual Clauses</a>{" "}
            and equivalent safeguards. Their respective Data Processing
            Agreements are publicly available.
          </p>

          {/* 10 */}
          <h2 id="security">10. Security</h2>
          <ul>
            <li>HTTPS everywhere (TLS).</li>
            <li>Row-Level Security on the database — you can only read or write your own rows.</li>
            <li>File storage is private; uploaded SVGs and built fonts are served via short-lived signed URLs.</li>
            <li>Supabase enforces Row-Level Security and Vercel/Render enforce network-level isolation.</li>
            <li>OAuth tokens are never stored in plaintext on our backend.</li>
          </ul>
          <p>
            No system is perfectly secure. If we ever discover a breach
            affecting your data, we&apos;ll notify you and the relevant
            authorities within 72 hours.
          </p>

          {/* 11 */}
          <h2 id="children">11. Children</h2>
          <p>
            Hue Type is not directed at children under 13 (or 16 in the EU,
            depending on local law). We do not knowingly collect data from
            children. If you believe a child has signed up, please email us
            and we&apos;ll delete the account.
          </p>

          {/* 12 */}
          <h2 id="changes">12. Changes to this policy</h2>
          <p>
            If we make material changes — for example introducing payments,
            adding a new sub-processor, or changing what we collect —
            we&apos;ll update this page, change the <em>Effective</em> date
            at the top, and notify signed-in users via email or an in-app
            banner.
          </p>

          {/* 13 */}
          <h2 id="contact">13. Contact</h2>
          <p>
            Questions, deletion requests, or privacy concerns —{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
          <p className="text-sm text-ht-ink/50 mt-10">
            Hue Type · Operated by Sunny Allan, India.
          </p>
        </div>
      </article>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-ht-surface bg-ht-white py-8 px-6 mt-12">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs text-ht-ink/40">
          <div className="flex items-center gap-3">
            <Logo size={24} />
            <span>© 2026 Hue Type</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/docs.html" className="hover:text-ht-ink transition-colors duration-200 ease-in-out">Docs</a>
            <Link href="/" className="hover:text-ht-ink transition-colors duration-200 ease-in-out">Home</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
