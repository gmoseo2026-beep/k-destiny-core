import React from "react";
import Link from "next/link";
import type { SeoFaq } from "@/lib/seo/content";
import { BASE_URL, canonicalUrlFor, productOgCardUrl, productSearchMeta } from "@/lib/seo";

/** 검색용 페이지 공통 조각(서버 컴포넌트 — 본문이 HTML 로 그대로 나간다) */

export function SeoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="w-full rounded-2xl border border-line bg-white p-5 shadow-xs">
      <h2 className="mb-2.5 text-base font-black text-ink">{title}</h2>
      <div className="space-y-2.5 text-sm leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}

export function TipsList({ title, tips }: { title: string; tips: string[] }) {
  return (
    <section className="w-full rounded-2xl border border-coral/25 bg-coral-soft p-5">
      <h2 className="mb-2.5 text-base font-black text-ink">{title}</h2>
      <ol className="space-y-2 text-sm leading-relaxed text-ink">
        {tips.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral text-[11px] font-black text-white">
              {i + 1}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FaqList({ faq }: { faq: SeoFaq[] }) {
  return (
    <section className="w-full rounded-2xl border border-line bg-white p-5 shadow-xs">
      <h2 className="mb-3 text-base font-black text-ink">자주 묻는 질문</h2>
      <dl className="space-y-4">
        {faq.map((f, i) => (
          <div key={i}>
            <dt className="text-sm font-bold text-plum">Q. {f.q}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-ink">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ChipLinks({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  if (links.length === 0) return null;
  return (
    <nav className="w-full" aria-label={title}>
      <h2 className="mb-2 text-sm font-extrabold text-ink">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            prefetch={false}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-text-2 transition-all active:scale-[0.96]"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="현재 위치" className="w-full text-[11px] text-text-3">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1">›</span>}
          {it.href ? (
            <Link href={it.href} prefetch={false} className="underline-offset-2 hover:underline">
              {it.label}
            </Link>
          ) : (
            <span className="text-text-2">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SeoDisclaimer() {
  return (
    <p className="w-full px-2 text-center text-[11px] leading-relaxed text-caption">
      ※ 띠(태어난 해)만으로 본 큰 틀이에요. 같은 띠라도 태어난 달·날·시간에 따라 결과가 달라져요. 콩닥의 모든 풀이는
      오락과 자기이해를 위한 참고 정보이며, 미래를 보장하지 않습니다.
    </p>
  );
}

/** 구조화 데이터(FAQ·경로). 검색 결과에 질문이 함께 보이도록. */
export function SeoJsonLd({ faq, crumbs }: { faq: SeoFaq[]; crumbs: Array<{ name: string; url: string }> }) {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/**
 * 상품 상세의 구조화 데이터(상품 + 경로). 검색엔진이 "무엇을 얼마에 파는 화면인지" 읽을 수 있게 한다.
 * 값은 전부 카탈로그에서 온다(우리가 쓴 고정 문구) — 손님 입력이 들어가지 않는다.
 */
export function ProductJsonLd({
  product,
}: {
  product: { id: string; name: string; description: string; hook: string; subtitle?: string; price: number; isFree?: boolean };
}) {
  const url = canonicalUrlFor(`/products/${product.id}`);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        description: productSearchMeta(product).description,
        image: `${BASE_URL}${productOgCardUrl(product.id)}`,
        url,
        brand: { "@type": "Brand", name: "콩닥" },
        category: "사주·궁합 디지털 리포트",
        offers: {
          "@type": "Offer",
          url,
          price: product.isFree ? 0 : product.price,
          priceCurrency: "KRW",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "콩닥", item: canonicalUrlFor("") },
          { "@type": "ListItem", position: 2, name: product.name, item: url },
        ],
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
