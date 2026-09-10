import PricingClient from "@/components/PricingClient";
import { createPageMetadata } from "@/lib/seo";

export const generateMetadata = createPageMetadata('/pricing');

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="min-h-screen bg-[#FFF6F1] pt-24 pb-12">
      <PricingClient locale={locale} />
    </div>
  );
}
