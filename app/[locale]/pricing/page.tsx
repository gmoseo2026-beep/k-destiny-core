import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

export const generateMetadata = createPageMetadata('/pricing');

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}#products`);
}
