import { Metadata } from "next";
import { redirect } from "next/navigation";
import GlobalCoupleNewClient from "@/components/global/GlobalCoupleNewClient";
import {
  GLOBAL_COUPLE_META,
  isGlobalCoupleLocale,
  resolveGlobalCoupleGuardRedirect,
} from "@/lib/globalCoupleLocale";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const meta = GLOBAL_COUPLE_META[isGlobalCoupleLocale(locale) ? locale : "en"];
  return {
    title: meta.title,
    description: meta.description,
    robots: { index: false, follow: false },
  };
}

export default async function GlobalCoupleNewPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { ref } = await searchParams;

  const guardTarget = resolveGlobalCoupleGuardRedirect(locale);
  if (guardTarget || !isGlobalCoupleLocale(locale)) {
    redirect(guardTarget ?? "/ko/compat/new");
  }

  return <GlobalCoupleNewClient locale={locale} refToken={ref} />;
}
