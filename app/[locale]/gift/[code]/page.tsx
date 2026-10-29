import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getProduct } from "@/lib/catalog";
import { formatGiftHeadline } from "@/lib/giftCopy";
import GiftRedeemClient, { type GiftViewData } from "@/components/gift/GiftRedeemClient";

interface PageProps {
  params: Promise<{ locale: string; code: string }>;
}

async function loadGiftViewData(rawCode: string): Promise<GiftViewData | null> {
  const cleanCode = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!cleanCode || !/^[a-f0-9]{16,64}$/i.test(cleanCode)) return null;

  const gift = await prisma.giftCode.findUnique({ where: { code: cleanCode } });
  if (!gift) return null;

  const purchaseOrder = await prisma.order.findUnique({
    where: { orderId: gift.purchaseOrderId },
    select: { status: true },
  });

  const product = getProduct(gift.catalogId);
  let status: GiftViewData["status"] = "AVAILABLE";
  if (!purchaseOrder || purchaseOrder.status !== "PAID") {
    status = "UNPAID";
  } else if (gift.used) {
    status = "USED";
  } else if (new Date(gift.expiresAt).getTime() <= Date.now()) {
    status = "EXPIRED";
  }

  return {
    code: gift.code,
    catalogId: gift.catalogId,
    productName: product?.name ?? "운세 리포트",
    target: product?.target ?? "individual",
    inputKind: product?.inputKind ?? "person",
    tier: product?.tier ?? "standard",
    senderNickname: gift.senderNickname,
    recipientNickname: gift.recipientNickname,
    message: gift.message,
    status,
    expiresAt: gift.expiresAt.toISOString(),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const gift = await loadGiftViewData(code);
  if (!gift) {
    return {
      title: "선물 코드를 찾을 수 없습니다 | 콩닥",
      robots: { index: false, follow: false },
    };
  }
  const headline = formatGiftHeadline(
    gift.senderNickname,
    gift.catalogId,
    gift.productName
  );
  return {
    title: `🎁 ${headline} | 콩닥`,
    description:
      gift.message ||
      `${gift.recipientNickname}님, 생년월일만 입력하면 선물받은 풀이를 바로 열어볼 수 있어요.`,
    robots: { index: false, follow: false },
  };
}

export default async function GiftRedeemPage({ params }: PageProps) {
  const { locale, code } = await params;
  const gift = await loadGiftViewData(code);
  if (!gift) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#140B18] text-[#F6EEF3] px-4 py-8 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center justify-between mb-6">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8AA1] to-[#FF5C77] flex items-center justify-center text-white text-xs font-black shadow-sm">
            콩
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#F6EEF3]">
            콩닥 <span className="text-xs font-semibold text-[#B9A9BF]">kongdak</span>
          </span>
        </Link>
      </header>

      <GiftRedeemClient locale={locale} gift={gift} />
    </main>
  );
}
