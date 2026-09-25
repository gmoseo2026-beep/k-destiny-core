"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { trackEvent } from "@/lib/gtag";
import KongdakMascot from "@/components/KongdakMascot";
import FortuneLoading from "@/components/FortuneLoading";
import { DeepReportContent } from "@/lib/destinyGen";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Lock, Compass, AlertTriangle, Lightbulb, Heart, Link2, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const GuestCheckoutModal = dynamic(() => import("@/components/GuestCheckoutModal"), { ssr: false });
import InAppBrowserModal from "@/components/InAppBrowserModal";
import { blockPaymentIfInApp, isInAppBrowser } from "@/lib/inAppBrowser";
import {
  requestPortOnePayment,
  recallUnlockToken,
  forgetUnlockToken,
  subscribeUnlockToken,
} from "@/lib/payments/client";
import { getProduct, priceLabel, setsContaining } from "@/lib/catalog";
import SetUpsell from "@/components/product/SetUpsell";

interface CompatData {
  id: string;
  shareToken: string;
  relation: string;
  score: number;
  keywords: string[];
  summaryKo: string | null;
  personA: { name: string; gender: string };
  personB: { name: string; gender: string };
}

/** 카카오 JS SDK 중 이 화면에서 실제로 쓰는 표면만 좁게 선언한다. */
interface KakaoLink {
  mobileWebUrl: string;
  webUrl: string;
}
interface KakaoSDK {
  init: (jsKey: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault?: (settings: {
      objectType: "feed";
      content: {
        title: string;
        description: string;
        imageUrl: string;
        imageWidth?: number;
        imageHeight?: number;
        link: KakaoLink;
      };
      buttons?: { title: string; link: KakaoLink }[];
    }) => void;
    sendScrap: (settings: {
      requestUrl: string;
      templateId?: number;
      templateArgs?: Record<string, string>;
    }) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

/**
 * Kakao SDK 를 필요한 시점에 (재)초기화한다.
 * SDK 는 layout 에서 `strategy="lazyOnload"` 로 주입되므로 이 컴포넌트의 마운트
 * 이펙트보다 늦게 도착할 수 있다. 마운트 때 한 번만 init 하면 그 경합에서 항상 지고
 * `isInitialized()` 가 false 로 남아 공유 버튼이 영구히 동작하지 않는다.
 * 따라서 클릭 시점에도 다시 확인해 초기화한다(멱등).
 */
function getReadyKakao(): KakaoSDK | null {
  if (typeof window === "undefined") return null;
  const kakao = window.Kakao;
  if (!kakao || typeof kakao.init !== "function") return null;
  try {
    if (!kakao.isInitialized()) {
      const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || "";
      if (!jsKey) return null;
      kakao.init(jsKey);
    }
    return kakao.isInitialized() ? kakao : null;
  } catch {
    return null;
  }
}

interface CompatResultClientProps {
  initialData: CompatData;
  locale: string;
  refToken?: string;
  isPremium?: boolean;
  /** 공개 판정된 상품 id — 세트 추천에서 숨긴 세트를 빼는 데 쓴다 */
  visibleIds?: string[];
}

export default function CompatResultClient({ initialData, locale, refToken, isPremium, visibleIds }: CompatResultClientProps) {
  const [data] = useState<CompatData>(initialData);
  const [summary, setSummary] = useState<string | null>(initialData.summaryKo);
  const [isGenerating, setIsGenerating] = useState<boolean>(!initialData.summaryKo);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [claimAvailable, setClaimAvailable] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  
  const [deepReport, setDeepReport] = useState<DeepReportContent | null>(null);
  const [isLoadingDeepReport, setIsLoadingDeepReport] = useState(false);
  const [deepReportError, setDeepReportError] = useState<string | null>(null);

  const compatProduct = getProduct("compat_basic");
  const compatPrice = compatProduct ? priceLabel(compatProduct) : "6,900원 · 회원 첫 결제 4,900원";

  // [SECURITY / H-2] 게스트/단건 구매자의 열람 증명 토큰(orderId).
  // 서버는 이 값을 받아야만 세션 없는 구매자의 소유권을 확인할 수 있다.
  // localStorage 는 클라이언트 전용 외부 저장소이므로 useSyncExternalStore 로 읽는다.
  // 서버 스냅샷을 null 로 두면 하이드레이션 불일치 없이 마운트 직후 값이 반영된다.
  // (값은 결제 완료 후 full reload 로만 바뀌므로 구독은 필요 없다)
  const unlockToken = useSyncExternalStore(
    subscribeUnlockToken,
    useCallback(() => recallUnlockToken(data.id), [data.id]),
    useCallback(() => null, [])
  );

  // Session & PortOne Checkout Modal State
  const { data: session } = useSession();
  const router = useRouter();
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutType, setCheckoutType] = useState<"SINGLE" | "PERIOD_PASS">("SINGLE");
  void checkoutType;
  // 결제할 상품: 기본은 정통 궁합, [세트로 보기]를 누르면 그 세트(같은 궁합 그대로)
  const [checkoutId, setCheckoutId] = useState("compat_basic");
  const checkoutProduct = getProduct(checkoutId) ?? compatProduct;
  const upsellSets = setsContaining("compat_basic", visibleIds ?? []);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // In-app Browser Guard & Notice State
  const [inAppOpen, setInAppOpen] = useState(false);
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setIsInApp(isInAppBrowser()));
  }, []);

  // Score Count-Up Animation (0 -> data.score in 0.8s ease-out + pop + haptic)
  const [displayScore, setDisplayScore] = useState(0);
  const [isScoreComplete, setIsScoreComplete] = useState(false);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;
    const duration = 800; // 0.8s
    const target = data.score;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(easeOut * target);
      setDisplayScore(val);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setIsScoreComplete(true);
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate?.(10);
          } catch {}
        }
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [data.score]);

  // 1. 유입 및 paywall 노출 GA4 이벤트 발사 + 주소창 ref 자동 동기화
  useEffect(() => {
    // ref 가 붙어 있는 진입 = 공유 링크를 통한 유입.
    // 작성자 본인의 최초 진입에는 ref 를 붙이지 않으므로(CompatNewClient) 여기 걸리지 않는다.
    if (refToken) {
      trackEvent("share_visit", { sourceCompatId: refToken, path: "compat_result" });
    }
    trackEvent("view_paywall", { source: "compat_result_bottom" });

    // 사용자가 주소창 URL을 그대로 복사해도 ref가 유지되도록 주소창 searchParams 보존
    if (typeof window !== "undefined" && !window.location.search.includes("ref=")) {
      const url = new URL(window.location.href);
      url.searchParams.set("ref", data.shareToken);
      window.history.replaceState({}, "", url.toString());
    }

    // Kakao SDK 초기화(가능하면 마운트 시점에)
    getReadyKakao();
  }, [refToken, data.shareToken]);

  // 미결제 paywall 렌더 시 1회 측정
  const hasTrackedLockedOffer = React.useRef(false);
  useEffect(() => {
    if (!isPremium && !unlockToken && !deepReport && data?.id && !hasTrackedLockedOffer.current) {
      hasTrackedLockedOffer.current = true;
      trackEvent("view_locked_offer", { compatId: data.id, score: data.score });
    }
  }, [isPremium, unlockToken, deepReport, data?.id, data?.score]);

  // [CLAIM UNLOCK] 로그인 상태에서 연동 가능한 결제가 있으면 배너로 안내한다.
  //
  // [SECURITY / M-8] 예전에는 진입 즉시 자동으로 귀속시켰다. 공용 PC(PC방 등)에서 게스트가
  // 결제만 하고 로그인하지 않은 채 자리를 뜨면, 같은 브라우저에서 다음으로 로그인한 사람에게
  // 결제가 조용히 넘어갔다. 이제 GET 으로 가능 여부만 확인하고, 실제 귀속은 사용자가 누를 때만 한다.
  //
  // [SECURITY / H-7] body 에서 orderId 를 제거했다. 서버는 httpOnly kd_claim 쿠키로만 소유권을
  // 판정한다(orderId 문자열만으로 타인의 미연동 주문을 선점할 수 있었던 폴백 경로 제거).
  useEffect(() => {
    if (!session?.user?.id || !data.id) return;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(`claimed_${data.id}`)) {
      return; // 이미 이번 세션에서 처리함
    }

    let isMounted = true;
    fetch(`/api/user/claim-unlock?compatId=${encodeURIComponent(data.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        // [L-2] 이 페이지의 궁합에 해당하는 결제일 때만 배너를 띄운다.
        //
        // 서버의 1차(쿠키) 경로는 claimToken 으로만 주문을 찾기 때문에 요청의 compatId 와
        // 무관한 주문이 claimable 로 돌아올 수 있다. 그대로 배너를 띄우면 궁합 B 화면에서
        // 눌렀는데 실제로는 궁합 A 가 연동되고, 토스트는 "이 궁합이 연동됐다"고 말한다.
        // 궁합 페이지에서는 일치할 때만 노출하고, 나머지는 대시보드 배너가 받는다.
        if (isMounted && result?.claimable && result?.compatId === data.id) {
          setClaimAvailable(true);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id, data.id]);

  const handleClaimUnlock = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch("/api/user/claim-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compatId: data.id }),
      });
      if (res.ok) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(`claimed_${data.id}`, "true");
        }
        setClaimAvailable(false);
        setCopyToast("구매하신 궁합 결과가 내 계정에 안전하게 연동되었습니다! 🎉");
        setTimeout(() => setCopyToast(null), 4000);
      } else {
        setClaimAvailable(false);
        setCopyToast("연동할 수 있는 결제를 찾지 못했어요.");
        setTimeout(() => setCopyToast(null), 3000);
      }
    } catch {
      setCopyToast("연동 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      setTimeout(() => setCopyToast(null), 3000);
    } finally {
      setIsClaiming(false);
    }
  };

  // 2. AI 무료 해석이 아직 없으면 클라이언트에서 비동기 생성 요청
  useEffect(() => {
    if (!summary && initialData.shareToken) {
      // isGenerating 은 !initialData.summaryKo 로 이미 true 로 초기화되어 있으므로
      // 여기서 다시 setState 하지 않는다(연쇄 렌더 방지).
      let isMounted = true;
      fetch("/api/generate-compat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareToken: initialData.shareToken,
          locale,
          isPremium: false,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("AI 해석 생성 실패");
          return res.text();
        })
        .then((text) => {
          if (isMounted) {
            setSummary(text);
            setIsGenerating(false);
          }
        })
        .catch((err) => {
          console.error("AI 해석 생성 오류:", err);
          if (isMounted) {
            setSummary("두 분은 서로의 부족한 에너지를 자연스럽게 채워주는 따뜻한 시너지를 지니고 있습니다. 편안한 신뢰와 존중을 바탕으로 함께 시간을 보낼수록 깊어지는 인연입니다.");
            setIsGenerating(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [summary, initialData.shareToken, locale]);

  // 3. 링크 공유 핸들러
  const handleShareLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://kongdak.kr";
    const shareUrl = `${origin}/${locale}/compat/${data.shareToken}?ref=${data.shareToken}`;

    trackEvent("share_created", { shareToken: data.shareToken, type: "link" });

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopyToast("공유 링크가 복사되었습니다! 친구에게 보내보세요 💌");
        setTimeout(() => setCopyToast(null), 3000);
      } catch {
        setCopyToast("링크 복사에 실패했습니다.");
        setTimeout(() => setCopyToast(null), 2000);
      }
    }
  };

  const handleGenerateDeepReport = async () => {
    setIsLoadingDeepReport(true);
    setDeepReportError(null);
    try {
      const res = await fetch("/api/compat/deep-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // orderId 는 게스트 소유권 증명 토큰. 없으면(로그인 패스 보유자) 서버가 세션으로 판정한다.
        body: JSON.stringify({ compatId: data.id, locale, orderId: unlockToken ?? undefined })
      });
      if (!res.ok) {
        // [SECURITY / H-4] 서버가 권한 없음으로 판정하면(환불·만료·회수) 이 기기의 토큰은 무효다.
        // 폐기해서 열람 UI 대신 결제 UI로 되돌린다. 판정 주체는 어디까지나 서버다.
        if (res.status === 403) forgetUnlockToken(data.id);
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate");
      }
      const json: DeepReportContent = await res.json();
      setDeepReport(json);
    } catch (e: unknown) {
      console.error(e);
      setDeepReportError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setIsLoadingDeepReport(false);
    }
  };

  // 4. 인스타 스토리 카드 다운로드 핸들러
  const handleDownloadCard = () => {
    // 카드 '생성'은 공유 실행이 아니므로 K 분모(share_created)에 넣지 않는다(진단용).
    trackEvent("share_card_created", { shareToken: data.shareToken, format: "story_1080x1350" });
    const downloadUrl = `/api/og/compat?shareToken=${encodeURIComponent(data.shareToken)}&w=1080&h=1350&download=true`;
    
    // 다운로드 트리거
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `kongdak_${data.personA.name}_${data.personB.name}_${data.score}점.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopyToast("인스타 스토리 카드를 다운로드하고 있습니다 📸");
    setTimeout(() => setCopyToast(null), 3000);
  };

  // 5. 카카오톡 공유 핸들러
  const handleKakaoShare = () => {
    // 공유 이벤트는 SDK 가 실제로 준비된 경우에만 발사한다.
    // (SDK 로드 실패 시에도 발사하면 K 계수의 분모만 부풀려져 바이럴 실패로 오독된다)
    const kakao = getReadyKakao();
    if (kakao) {
      trackEvent("share_created", { shareToken: data.shareToken, type: "kakao" });

      // 로컬 개발(localhost)이 아닌 경우 공식 사이트 URL(https://kongdak.kr)로 정규화
      let baseDomain = process.env.NEXT_PUBLIC_SITE_URL || "https://kongdak.kr";
      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          baseDomain = window.location.origin;
        }
      }

      const shareUrl = `${baseDomain}/${locale}/compat/${data.shareToken}?ref=${data.shareToken}`;
      const imageUrl = `${baseDomain}/api/og/compat?shareToken=${encodeURIComponent(data.shareToken)}&w=800&h=400`;

      try {
        if (typeof kakao.Share?.sendDefault === "function") {
          kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: `${data.personA.name} ❤️ ${data.personB.name}의 궁합 점수: ${data.score}점! 🔮`,
              description: `우리의 케미 키워드: ${data.keywords.join(", ")}\n\n지금 바로 두 사람의 사주 궁합을 확인해보세요 👇\n${shareUrl}`,
              imageUrl: imageUrl,
              imageWidth: 800,
              imageHeight: 400,
              link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl,
              },
            },
            buttons: [
              {
                title: '궁합 결과 확인하기 💘',
                link: {
                  mobileWebUrl: shareUrl,
                  webUrl: shareUrl,
                },
              },
            ],
          });
        } else if (typeof kakao.Share?.sendScrap === "function") {
          kakao.Share.sendScrap({
            requestUrl: shareUrl,
          });
        }
      } catch (err) {
        console.error("카카오 공유 전송 실패:", err);
        // 오류 발생 시 스크랩 방식으로 재시도
        if (typeof kakao.Share?.sendScrap === "function") {
          kakao.Share.sendScrap({ requestUrl: shareUrl });
        }
      }
    } else {
      setCopyToast("카카오톡 공유를 준비 중입니다. 잠시 후 다시 시도해주세요.");
      setTimeout(() => setCopyToast(null), 2000);
    }
  };

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto flex flex-col items-center pb-32 sm:pb-36">
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-5 py-3 rounded-full text-sm font-semibold shadow-xl transition-all duration-300 border border-[#FF8AA1]/30">
          {copyToast}
        </div>
      )}

      {/* [SECURITY / M-8] 결제 연동은 사용자가 직접 확인할 때만 수행한다(자동 귀속 금지) */}
      {claimAvailable && (
        <Card variant="soft" className="w-full mt-4 p-4 flex items-center gap-3">
          <span className="text-xl shrink-0">💌</span>
          <p className="flex-1 text-xs text-text-2 leading-relaxed font-medium">
            결제하신 궁합 결과가 있어요. 이 계정에 저장할까요?
          </p>
          <Button
            type="button"
            size="sm"
            onClick={handleClaimUnlock}
            disabled={isClaiming}
            isLoading={isClaiming}
            className="shrink-0"
          >
            연동하기
          </Button>
        </Card>
      )}

      {/* Main Score Card */}
      <div className="w-full bg-gradient-to-br from-[#FF8AA1] via-[coral] to-[plum] rounded-3xl p-6 sm:p-8 text-white text-center shadow-lg relative overflow-hidden mt-4">
        <div className="absolute bottom-4 left-6 text-white/10 text-3xl font-black select-none pointer-events-none">kongdak</div>

        <h2 className="text-sm sm:text-base font-extrabold text-white/90 uppercase tracking-wider mb-4">
          우리 두 사람의 사주 궁합
        </h2>

        {/* Triangular Couple & Destiny Red Thread Layout */}
        <div className="relative flex items-center justify-between w-full max-w-xs sm:max-w-sm mx-auto mb-4 px-2">
          {/* Person A (나) + 콩이 */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md p-1 border border-white/30 shadow-md flex items-center justify-center">
              <KongdakMascot size={52} expression="canon" animate="pulse" />
            </div>
            <span className="text-xs font-bold text-white bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm truncate max-w-[85px]">
              {data.personA.name}
            </span>
          </div>

          {/* Center: Red Thread Fate Heart */}
          <div className="flex flex-col items-center justify-center flex-1 px-1 z-10">
            <div className="w-16 h-12 flex items-center justify-center animate-pulse">
              <KongdakMascot size={56} expression="couple" animate="heartbeat" />
            </div>
            <span className="text-[10px] font-extrabold text-gold tracking-wider uppercase bg-black/25 px-2 py-0.5 rounded-full mt-0.5">
              인연의 붉은 실
            </span>
          </div>

          {/* Person B (상대) + 닥이 */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md p-1 border border-white/30 shadow-md flex items-center justify-center">
              <KongdakMascot size={52} expression="canon_white" animate="pulse" />
            </div>
            <span className="text-xs font-bold text-white bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm truncate max-w-[85px]">
              {data.personB.name}
            </span>
          </div>
        </div>

        {/* Big Score with Reaction Mascot */}
        <div className="flex items-center justify-center gap-3 my-2">
          <KongdakMascot size={64} score={data.score} animate="heartbeat" />
          <div className="flex items-baseline gap-1">
            <span
              className={`text-6xl sm:text-7xl font-black tracking-tight drop-shadow-md transition-transform duration-150 ${
                isScoreComplete ? "animate-score-pop" : "scale-[0.98]"
              }`}
            >
              {displayScore}
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-gold">점</span>
          </div>
        </div>

        {/* High Score (>=90) Celebratory Reaction (1-time) */}
        {data.score >= 90 && isScoreComplete && (
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-gold animate-pulse my-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>최고의 찰떡 인연 발견!</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Score Reaction Mood Badge */}
        <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-md text-cream px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold border border-white/20 my-2 shadow-sm">
          {data.score >= 90 && "심쿵주의! 천생연분 궁합"}
          {data.score >= 80 && data.score < 90 && "불꽃 케미! 찰떡호흡 궁합"}
          {data.score >= 70 && data.score < 80 && "두근두근! 설레는 꿀케미"}
          {data.score >= 60 && data.score < 70 && "오글오글! 매력적인 밀당 케미"}
          {data.score < 60 && "반전매력! 서로 맞춰가는 노력형 케미"}
        </div>

        {/* Keywords 3 Chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {data.keywords.map((kw, i) => (
            <span
              key={i}
              className="bg-white/20 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm border border-white/20"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* 2-B. Top Primary CTA Banner (미결제 시 점수 직후 노출) */}
      {!isPremium && !unlockToken && !deepReport && (
        <>
          <button
            type="button"
            onClick={() => {
              if (blockPaymentIfInApp(() => setInAppOpen(true))) return;
              trackEvent("click_top_cta", { compatId: data.id });
              setCheckoutType("SINGLE");
              setCheckoutId("compat_basic");
              setCheckoutModalOpen(true);
            }}
            className="w-full mt-4 bg-white hover:bg-surface-soft border border-line rounded-2xl p-4 shadow-xs transition-all duration-150 active:scale-[0.98] flex items-center justify-between gap-2 group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-coral-soft flex items-center justify-center text-coral-deep shrink-0">
                <Lock className="w-4 h-4" />
              </span>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-ink group-hover:text-coral transition-colors">
                    결정적인 건 잠겨 있어요 — 전체 리포트 열기
                  </span>
                  <Badge variant="popular">
                    {compatPrice}
                  </Badge>
                </div>
                <span className="text-[11px] text-text-3 truncate">
                  갈등 유발 포인트 3가지 & 극복법 · 현실 연애 조언
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-coral shrink-0 flex items-center gap-0.5 bg-surface-soft px-3 py-1.5 rounded-xl border border-line shadow-2xs group-hover:bg-coral group-hover:text-white transition-all">
              열기 <ArrowRight className="w-3 h-3" />
            </span>
          </button>

          {/* In-app Browser Notice Banner (인앱 결제 오류 사전 탈출 유도) */}
          {isInApp && (
            <div
              onClick={() => blockPaymentIfInApp(() => setInAppOpen(true))}
              className="w-full mt-2.5 bg-coral-soft hover:bg-coral/20 border border-coral/30 rounded-2xl p-3 text-xs text-ink flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <span className="font-semibold text-left">
                🔒 원활한 결제를 위해 오른쪽 위 메뉴(⋮)에서 <strong>‘다른 브라우저로 열기’</strong>를 눌러주세요.
              </span>
              <span className="text-[11px] font-bold text-coral shrink-0 underline whitespace-nowrap">
                외부 브라우저 열기
              </span>
            </div>
          )}
        </>
      )}

      {/* AI Free Summary Section */}
      <Card className="w-full mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-coral" />
          <h3 className="text-base font-black text-ink">우리 사이의 진짜 케미</h3>
        </div>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <KongdakMascot size={96} animate="bounce" />
            <p className="text-sm font-bold text-plum mt-1 animate-pulse">
              두근두근 궁합 보는 중…
            </p>
            <div className="w-full space-y-2 mt-2">
              <div className="h-3 bg-surface-soft rounded-full animate-pulse w-full" />
              <div className="h-3 bg-surface-soft rounded-full animate-pulse w-4/5 mx-auto" />
            </div>
            <p className="text-xs text-text-3">
              두 사람의 기운을 다정하게 읽고 있어요
            </p>
          </div>
        ) : (
          <div className="text-sm text-ink leading-relaxed space-y-3 whitespace-pre-line font-medium">
            {summary}
          </div>
        )}
      </Card>

      {/* Premium Section */}
      {deepReport ? (
        <div className="w-full mt-8 flex flex-col gap-6">
          <div className="text-center mb-2">
            <div className="inline-block bg-plum text-gold text-xs font-black px-4 py-1.5 rounded-full shadow-md uppercase tracking-widest">
              Premium Reading
            </div>
            <p className="text-[11px] text-[#8A8291] mt-1.5 font-medium">
              열람 유효기간: 결제일로부터 90일간 이용 가능
            </p>
          </div>
          
          <div className="w-full bg-white rounded-2xl p-6 shadow-md border-t-4 border-plum">
            <h3 className="text-lg font-black text-plum mb-3">우리 관계의 핵심 에너지</h3>
            <p className="text-sm text-ink leading-relaxed font-medium">{deepReport.coreDynamic}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-white rounded-2xl p-6 shadow-md border-l-4 border-[#FF8AA1]">
              <h3 className="text-base font-black text-coral mb-3">시너지 강점</h3>
              <ul className="text-sm text-ink leading-relaxed space-y-2 font-medium list-disc list-inside">
                {deepReport.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="flex-1 bg-white rounded-2xl p-6 shadow-md border-l-4 border-gray-400">
              <h3 className="text-base font-black text-gray-700 mb-3">주의할 점</h3>
              <ul className="text-sm text-ink leading-relaxed space-y-2 font-medium list-disc list-inside">
                {deepReport.cautions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>

          <div className="w-full bg-cream rounded-2xl p-6 shadow-md border border-[#FFD9E0]/50">
            <h3 className="text-lg font-black text-coral mb-4 text-center">갈등 포인트 & 대처법</h3>
            <div className="space-y-4">
              {deepReport.conflictsAndSolutions.map((cs, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="font-bold text-plum text-sm mb-1">Q. {cs.trigger}</div>
                  <div className="text-sm text-ink font-medium leading-relaxed pl-4 border-l-2 border-gold bg-cream/30 p-2 rounded-r-md">
                    {cs.solution}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full bg-white rounded-2xl p-6 shadow-md border-t-4 border-gold">
            <h3 className="text-base font-black text-ink mb-3">연애 조언 & 애정운</h3>
            <p className="text-sm text-ink leading-relaxed font-medium mb-4">{deepReport.actionableAdvice}</p>
            <div className="bg-cream p-4 rounded-xl text-sm text-plum font-bold">
              이번 달 애정운: {deepReport.monthlyFortune}
            </div>
          </div>

          <div className="w-full bg-gradient-to-r from-[#FF8AA1]/10 to-[plum]/10 rounded-2xl p-6 shadow-sm border border-coral/20 text-center">
            <h3 className="text-base font-black text-plum mb-2">나와 찰떡인 이상형 사주 기운</h3>
            <p className="text-sm font-bold text-coral mb-1">{deepReport.idealMatchEnergy.energyName}</p>
            <p className="text-xs text-ink font-medium leading-relaxed">{deepReport.idealMatchEnergy.traits}</p>
          </div>

          {/* Guest Retention & Account Binding Banner */}
          {!session?.user?.id && (
            <div className="w-full bg-[#FFF0F3] border border-[#FFD9E0] rounded-2xl p-5 text-left shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-coral">
                <span>비회원 결과 보관 안내</span>
              </div>
              <p className="text-xs text-[#6A5E72] leading-relaxed mb-4">
                현재 사용 중인 브라우저에 열람 권한이 보관되어 있습니다. 기기를 바꾸거나 캐시를 지워도 언제든 다시 보려면 링크를 복사해 두시거나, 무료 회원가입으로 내 계정에 안전하게 저장해 두세요!
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleShareLink}
                  className="flex-1 bg-white border border-[#FFD9E0] text-plum py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs hover:bg-cream transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>결과 링크 복사하기</span>
                </button>
                <Link
                  href={`/${locale}/login?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : `/${locale}/compat/${data.shareToken}`)}`}
                  className="flex-1 bg-coral text-white py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs hover:bg-coral transition-all flex items-center justify-center gap-1.5 active:scale-95 text-center"
                >
                  <span>3초 가입하고 결과 영구 저장</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="w-full mt-8 text-center relative overflow-hidden">
          <div className="inline-block bg-plum-deep text-gold text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            Special Reading
          </div>
          <h4 className="text-lg font-black text-ink mb-2">
            우리 관계의 진짜 갈등 포인트와<br/>현실적인 연애 조언이 궁금하다면?
          </h4>
          <p className="text-sm text-text-2 mb-6 font-medium">
            서로에게 끌리는 진짜 이유와 타이밍까지<br/>AI가 분석한 심층 궁합 리포트를 만나보세요.
          </p>
          
          {isPremium || unlockToken ? (
            isLoadingDeepReport ? (
              <FortuneLoading
                steps={[
                  "두 사람의 사주를 대조하는 중…",
                  "관계 흐름을 해석하는 중…",
                  "심층 리포트를 정리하는 중…",
                ]}
                durationSec={15}
                subMessage="두 사람의 기운과 궁합을 심층 분석하고 있어요"
                skeletonVariant="deep-report"
                className="py-2"
              />
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleGenerateDeepReport}
                  disabled={isLoadingDeepReport}
                  isLoading={isLoadingDeepReport}
                  size="lg"
                  fullWidth
                >
                  콩닥 플러스: 심층 리포트 즉시 열람
                </Button>
                {deepReportError && <p className="text-xs text-red-500 mt-1">{deepReportError}</p>}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-3">
              {/* 잠긴 심층 리포트 궁금증-갭 미리보기: 영역별 1줄 훅 + --surface-soft 바탕 + 자물쇠 */}
              <Card variant="soft" className="w-full text-left mb-3">
                <div className="flex items-center justify-between mb-3.5">
                  <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-coral" />
                    <span>{data.personA.name} × {data.personB.name} 심층 궁합 미리보기</span>
                  </p>
                  <Badge variant="popular">
                    핵심 포인트 잠김
                  </Badge>
                </div>

                <div className="space-y-3">
                  {/* Item 1: 갈등 포인트 3가지 */}
                  <div className="p-3 bg-white rounded-xl border border-line flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-coral" />
                        <span className="text-xs sm:text-sm font-extrabold text-ink">
                          우리 사이 갈등 포인트 3가지 & 극복법
                        </span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-coral" />
                    </div>
                    <p className="text-xs font-medium text-text-2 leading-snug">
                      두 사람이 감정적으로 부딪히기 쉬운 결정적 계기와 오해가 시작되는 순간, 실전 대처법이 담겨 있습니다.
                    </p>
                  </div>

                  {/* Item 2: 관계의 핵심 에너지 */}
                  <div className="p-3 bg-white rounded-xl border border-line flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-plum" />
                        <span className="text-xs sm:text-sm font-extrabold text-ink">
                          관계의 핵심 에너지 & 시너지
                        </span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-text-3" />
                    </div>
                    <p className="text-xs font-medium text-text-2 leading-snug">
                      서로에게 자석처럼 끌리는 타고난 기운의 비밀과 폭발적인 시너지 포인트를 분석합니다.
                    </p>
                  </div>

                  {/* Item 3: 현실 연애 조언 & 타이밍 */}
                  <div className="p-3 bg-white rounded-xl border border-line flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-[#C98A0B]" />
                        <span className="text-xs sm:text-sm font-extrabold text-ink">
                          현실 연애 조언 & 이번 달 애정운 타이밍
                        </span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-text-3" />
                    </div>
                    <p className="text-xs font-medium text-text-2 leading-snug">
                      두 사람 사이에 중요한 대화나 결정을 내리기 가장 좋은 타이밍과 실전 소통법을 알려드립니다.
                    </p>
                  </div>

                  {/* Item 4: 이상형 사주 기운 */}
                  <div className="p-3 bg-white rounded-xl border border-line flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-coral" />
                        <span className="text-xs sm:text-sm font-extrabold text-ink">
                          나와 찰떡인 이상형 사주 기운
                        </span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-text-3" />
                    </div>
                    <p className="text-xs font-medium text-text-2 leading-snug">
                      상대방의 기운 중 나를 가장 편안하게 만들어주는 매력 포인트와 궁극의 인연 조화를 분석합니다.
                    </p>
                  </div>
                </div>
              </Card>

              {/* 단건 리포트 안내 카드 — 기간권 UI 동면(D4) */}
              <div className="mb-2 text-left w-full">
                <div className="bg-surface-soft p-3 rounded-2xl border border-line">
                  <span className="text-[10px] font-extrabold text-coral block mb-0.5">단건 리포트</span>
                  <span className="text-xs font-black text-ink block">심층 궁합 1회</span>
                  <span className="text-[10px] text-text-3 leading-tight block mt-0.5">{compatPrice} · 90일 보관</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (blockPaymentIfInApp(() => setInAppOpen(true))) return;
                  trackEvent("click_unlock_single", { compatId: data.id });
                  setCheckoutType("SINGLE");
                  setCheckoutId("compat_basic");
                  setCheckoutModalOpen(true);
                }}
                className="w-full bg-coral hover:bg-coral-deep text-white py-4 px-4 rounded-2xl font-bold text-sm shadow-[0_8px_20px_rgba(224,36,90,0.25)] transition-all duration-150 active:scale-[0.96] flex flex-col items-center justify-center gap-0.5"
              >
                <span className="text-sm sm:text-base font-extrabold text-white">
                  우리 갈등 포인트 & 심층 리포트 열기
                </span>
                <span className="text-[11px] font-medium text-white/90">
                  {compatPrice} · 결제 후 90일간 즉시 열람
                </span>
              </button>

              {upsellSets.length > 0 && (
                <div className="mt-3">
                  <SetUpsell
                    sets={upsellSets.slice(0, 1)}
                    source="compat_result"
                    currentId="compat_basic"
                    onChoose={(set) => {
                      if (blockPaymentIfInApp(() => setInAppOpen(true))) return;
                      trackEvent("view_paywall", { productId: set.id, tier: set.tier, amountLabel: priceLabel(set) });
                      setCheckoutId(set.id);
                      setCheckoutModalOpen(true);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="w-full flex flex-col gap-3 mt-8">
        {/* Kakao Share Button */}
        <button
          onClick={handleKakaoShare}
          className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 active:scale-[0.96] text-[#191919] py-4 rounded-2xl font-bold text-base shadow-xs transition-all duration-150 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
            <path d="M16 4.64C8.269 4.64 2 9.697 2 15.942c0 4.024 2.502 7.55 6.275 9.624l-1.579 5.86c-.116.425.353.754.73.522l6.815-4.51c.563.078 1.144.12 1.749.12 7.73 0 14-5.057 14-11.302S23.73 4.64 16 4.64z"/>
          </svg>
          <span>카카오톡으로 결과 공유하기</span>
        </button>

        {/* Share Link Button */}
        <Button
          onClick={handleShareLink}
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Link2 className="w-5 h-5 text-white" />}
        >
          <span>링크 복사하기</span>
        </Button>

        {/* Download Story Card Button */}
        <Button
          onClick={handleDownloadCard}
          variant="secondary"
          size="lg"
          fullWidth
          leftIcon={<span className="text-base">📸</span>}
        >
          <span>인스타 스토리 카드 다운로드 (1080×1350)</span>
        </Button>
      </div>

      {/* Guest Checkout Modal */}
      <GuestCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title={checkoutId === "compat_basic" ? "심층 궁합 리포트 잠금 해제" : `${checkoutProduct?.name} 열람`}
        orderName={checkoutProduct?.name || "콩닥 심층 궁합 리포트"}
        priceLabel={checkoutProduct ? priceLabel(checkoutProduct) : compatPrice}
        initialName={session?.user?.name || ""}
        initialEmail={session?.user?.email || ""}
        initialPhone=""
        isLoading={isProcessingPayment}
        onSubmit={async (buyer) => {
          try {
            setIsProcessingPayment(true);
            const res = await requestPortOnePayment({
              productId: checkoutId,
              compatId: data.id,
              buyer,
              locale,
            });
            if (res.ok) {
              trackEvent("purchase_confirmed", {
                productId: checkoutId,
                tier: checkoutProduct?.tier || "standard",
                amount: res.amount,
              });
              if (checkoutId === "compat_basic") {
                router.refresh();
              } else {
                // 세트: 구성 리포트를 만드는 화면으로. 정통 궁합은 거기서 이 화면으로 다시 연결된다
                router.push(`/${locale}/report/new?c=${checkoutId}&compat=${data.id}`);
              }
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "결제 진행 중 오류가 발생했습니다.";
            alert(msg);
          } finally {
            setIsProcessingPayment(false);
            setCheckoutModalOpen(false);
          }
        }}
      />

      {/* 2-A. Sticky Bottom CTA (미결제 시 뷰포트 하단 고정) */}
      {!isPremium && !unlockToken && !deepReport && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#FFD9E0] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-4">
          <div className="max-w-md md:max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex flex-col text-left">
              <span className="text-[10px] sm:text-xs font-bold text-[#8A8291] flex items-center gap-1">
                <Lock className="w-3 h-3 text-coral" />
                전체 심층 리포트 열기
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm sm:text-base font-black text-coral">{compatPrice}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (blockPaymentIfInApp(() => setInAppOpen(true))) return;
                trackEvent("click_sticky_cta", { compatId: data.id });
                setCheckoutType("SINGLE");
                setCheckoutId("compat_basic");
                setCheckoutModalOpen(true);
              }}
              className="bg-coral hover:bg-coral active:scale-[0.96] text-white px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm shadow-[0_4px_12px_rgba(255,92,119,0.3)] transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>지금 열기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* InApp Browser Manual Escape Modal */}
      <InAppBrowserModal isOpen={inAppOpen} onClose={() => setInAppOpen(false)} />

      {/* New Test CTA */}
      <div className="mt-8 text-center">
        <Link
          href={refToken ? `/${locale}/compat/new?ref=${encodeURIComponent(refToken)}` : `/${locale}/compat/new`}
          className="text-xs font-semibold text-[#8A8291] hover:text-coral underline underline-offset-4 transition-colors"
        >
          다른 사람과의 궁합도 새로 알아보기 →
        </Link>
      </div>
    </div>
  );
}
