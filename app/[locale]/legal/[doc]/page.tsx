import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import GlobalChrome from "@/components/global/GlobalChrome";
import {
  isGlobalCoupleLocale,
  resolveGlobalCoupleGuardRedirect,
} from "@/lib/globalCoupleLocale";

type LegalDoc = "terms" | "privacy" | "refund";

interface PageProps {
  params: Promise<{ locale: string; doc: string }>;
}

function isLegalDoc(doc: string): doc is LegalDoc {
  return doc === "terms" || doc === "privacy" || doc === "refund";
}

const DOC_TITLES: Record<LegalDoc, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  refund: "Refund & Cancellation Policy",
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { doc } = await params;
  const title = isLegalDoc(doc)
    ? `${DOC_TITLES[doc]} — kongdak`
    : "Legal — kongdak";
  return {
    title,
    robots: {
      index: false,
      follow: false,
    },
  };
}

const OVERSEAS_TRANSFERS = [
  {
    trustee: "Supabase, Inc.",
    task: "Database hosting & storage",
    country: "United States",
  },
  {
    trustee: "Contabo GmbH",
    task: "Server infrastructure operation",
    country: "Germany",
  },
  {
    trustee: "Cloudflare, Inc.",
    task: "CDN, security (DDoS/WAF) & traffic routing",
    country: "United States",
  },
  {
    trustee: "Google LLC (Gemini API)",
    task: "AI compatibility & fortune reading text generation",
    country: "United States",
  },
  {
    trustee: "Google LLC (Google Analytics)",
    task: "Service usage analytics & statistics",
    country: "United States",
  },
  {
    trustee: "Kakao · Naver · Google",
    task: "Social login & account authentication",
    country: "Republic of Korea (Kakao, Naver), United States (Google)",
  },
];

export default async function GlobalLegalDocPage({ params }: PageProps) {
  const { locale, doc } = await params;

  const guardTarget = resolveGlobalCoupleGuardRedirect(locale);
  if (guardTarget || !isGlobalCoupleLocale(locale)) {
    redirect(guardTarget ?? "/ko/compat/new");
  }

  if (!isLegalDoc(doc)) {
    notFound();
  }

  const showEnglishBadge = locale === "ja" || locale === "zh";

  return (
    <GlobalChrome locale={locale}>
      <div className="space-y-5 pb-8">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/${locale}/couple`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-text-2 hover:text-[#FF5C77] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Compatibility</span>
          </Link>

          {showEnglishBadge && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FFF0F3] border border-[#FFD9E0] text-[11px] font-extrabold text-[#FF5C77]">
              English version
            </span>
          )}
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-3xl border border-line p-6 text-center space-y-2 shadow-2xs">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#FF5C77] uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Legal Notice</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#2B2430]">
            {DOC_TITLES[doc]}
          </h1>
          <p className="text-xs text-text-3">Effective Date: September 1, 2026</p>
        </div>

        {doc === "terms" && (
          <div className="space-y-4 text-xs sm:text-sm text-[#2B2430] leading-relaxed">
            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                Article 1 (Purpose)
              </h2>
              <p>
                These Terms of Service govern the rights, obligations, and
                responsibilities between DI Company (디아이컴퍼니, hereinafter the
                &ldquo;Company&rdquo;) and users in connection with the use of the
                kongdak (콩닥) web and mobile service (hereinafter the
                &ldquo;Service&rdquo;).
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                Article 2 (Definitions)
              </h2>
              <p>
                1. &ldquo;Service&rdquo; means the kongdak web and mobile web
                service that provides couple compatibility and relationship
                readings based on Korean Saju (birth-date) principles.
                <br />
                2. &ldquo;User&rdquo; means any member or non-member who accesses
                and uses the Service under these Terms.
                <br />
                3. &ldquo;Content&rdquo; means compatibility scores, readings,
                share cards, and any other digital outputs provided by the
                Service.
              </p>
            </section>

            <section className="bg-[#FFF0F3]/60 rounded-2xl border border-[#FF5C77]/30 p-5 space-y-2">
              <h2 className="font-extrabold text-[#FF5C77] text-sm">
                Article 3 (Nature of the Service — Entertainment &amp;
                Self-Reflection)
              </h2>
              <p className="font-medium">
                All compatibility, Saju, and fortune readings provided by the
                Service are reference information intended solely for
                entertainment and self-reflection. They do not constitute
                medical, legal, psychological, or financial advice, nor do they
                guarantee or predict factual future outcomes regarding
                relationships, health, or wealth. Users rely on the Content at
                their own discretion and responsibility.
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                Article 4 (User Obligations &amp; Intellectual Property)
              </h2>
              <p>
                1. Users shall not enter another person&apos;s birth information
                without consent, disrupt normal operation of the Service through
                automated requests, or commercially reproduce or redistribute
                Content without authorization.
                <br />
                2. All intellectual property rights in the Service and Content
                belong to the Company. Personal, non-commercial sharing via
                share links and share cards provided by the Service is
                permitted.
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                Article 5 (Governing Law &amp; Contact)
              </h2>
              <p>
                These Terms are governed by the laws of the Republic of Korea.
                For any questions regarding these Terms, please contact{" "}
                <a
                  href="mailto:help@kongdak.kr"
                  className="text-[#FF5C77] font-bold underline"
                >
                  help@kongdak.kr
                </a>
                .
              </p>
            </section>
          </div>
        )}

        {doc === "privacy" && (
          <div className="space-y-4 text-xs sm:text-sm text-[#2B2430] leading-relaxed">
            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <p>
                DI Company (디아이컴퍼니, the &ldquo;Company&rdquo;) complies with
                the Personal Information Protection Act of the Republic of Korea
                and processes personal information for the kongdak service as
                follows.
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-line p-5 space-y-2.5">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                1. Information Collected &amp; Hashing of Birth Data
              </h2>
              <p>
                <strong>• Compatibility Calculation:</strong> Date of birth,
                gender, optional birth time, and optional name/nickname for
                Person A and Person B.
              </p>
              <p className="text-[#FF5C77] font-medium text-xs">
                ※ Raw dates of birth and birth times entered by non-member users
                are used only at the moment of calculation and are NEVER stored
                in plain text on our servers; only an irreversible cryptographic
                hash (SHA-256 with secret pepper) and derived Saju indicators
                are stored.
              </p>
              <p>
                <strong>• Automatically Collected Data:</strong> Access logs, IP
                address, browser/device information, analytics identifiers
                (GA4), and a non-identifiable random visitor cookie (
                <code>kd_vid</code>, 1 year) or partner referral cookie (
                <code>kd_src</code>, 30 days).
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                2. Purpose of Processing &amp; Retention Period
              </h2>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Calculating deterministic compatibility scores and generating
                  AI compatibility readings.
                </li>
                <li>
                  Providing shareable result links and improving service
                  stability and statistics.
                </li>
                <li>
                  Compatibility records and hashes are deleted without delay
                  once the purpose of provision is fulfilled or upon a
                  user&apos;s deletion request via{" "}
                  <a
                    href="mailto:help@kongdak.kr"
                    className="text-[#FF5C77] underline"
                  >
                    help@kongdak.kr
                  </a>
                  .
                </li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl border border-line p-5 space-y-3">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                3. Sub-Processors &amp; Cross-Border Data Transfers
              </h2>
              <p className="text-xs text-text-2">
                To operate the Service reliably and generate AI readings, the
                Company entrusts processing to the following service providers:
              </p>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFF6F1] text-[#6A2C70] border-b border-line">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Provider</th>
                      <th className="py-2.5 px-3 font-bold">Task</th>
                      <th className="py-2.5 px-3 font-bold">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {OVERSEAS_TRANSFERS.map((row) => (
                      <tr key={row.trustee}>
                        <td className="py-2.5 px-3 font-semibold">
                          {row.trustee}
                        </td>
                        <td className="py-2.5 px-3">{row.task}</td>
                        <td className="py-2.5 px-3 text-text-3">
                          {row.country}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                4. Your Rights &amp; Chief Privacy Officer
              </h2>
              <p>
                Users may request access to, correction of, or deletion of their
                personal data at any time. The Service is intended for users
                aged 14 and older.
              </p>
              <p className="text-xs text-text-2 pt-1">
                <strong>Company:</strong> DI Company (디아이컴퍼니) |{" "}
                <strong>CEO &amp; Privacy Officer:</strong> Soo-kyung Choi
                (최수경) | <strong>Email:</strong>{" "}
                <a
                  href="mailto:help@kongdak.kr"
                  className="text-[#FF5C77] font-bold underline"
                >
                  help@kongdak.kr
                </a>
              </p>
            </section>
          </div>
        )}

        {doc === "refund" && (
          <div className="space-y-4 text-xs sm:text-sm text-[#2B2430] leading-relaxed">
            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                1. Digital Content Delivery
              </h2>
              <p>
                All compatibility and fortune readings on kongdak are intangible
                digital content delivered immediately on the web upon generation.
                There is no physical shipping, and there are no recurring
                auto-renewal subscriptions.
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                2. Right of Withdrawal &amp; Refund Policy
              </h2>
              <p>
                1. The foreign-language couple compatibility experience (
                <code>/en/couple</code>, <code>/ja/couple</code>,{" "}
                <code>/zh/couple</code>) is currently provided free of charge.
                <br />
                2. For any paid digital reports offered by the Service, under
                Article 17(2) of the Act on the Consumer Protection in Electronic
                Commerce of the Republic of Korea, withdrawal of subscription
                (refund) is restricted once the digital report has been
                generated and opened (provision commenced).
                <br />
                3. If a paid report has not yet been generated or opened, or if
                a technical error attributable to the Company prevented normal
                delivery of the content, a 100% full refund will be issued.
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-line p-5 space-y-2">
              <h2 className="font-extrabold text-[#6A2C70] text-sm">
                3. How to Request Support or a Refund
              </h2>
              <p>
                Please email{" "}
                <a
                  href="mailto:help@kongdak.kr"
                  className="text-[#FF5C77] font-bold underline"
                >
                  help@kongdak.kr
                </a>{" "}
                with your order details or share link. We respond promptly to
                all support inquiries.
              </p>
            </section>
          </div>
        )}
      </div>
    </GlobalChrome>
  );
}
