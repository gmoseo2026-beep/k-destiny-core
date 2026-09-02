import { getTranslations } from "next-intl/server";
import PricingClient from "@/components/PricingClient";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "Pricing" });

  return {
    title: `${t("title")} | 콩닥 (kongdak)`,
    description: t("subtitle"),
  };
}

export default function PricingPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <div className="min-h-screen bg-[#FFF6F1] pt-24 pb-12">
      <PricingClient locale={locale} />
    </div>
  );
}
