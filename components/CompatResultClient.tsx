"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { trackEvent } from "@/lib/gtag";
import KongdakMascot from "@/components/KongdakMascot";
import { DeepReportContent } from "@/lib/destinyGen";
import { useSession } from "next-auth/react";
import GuestCheckoutModal from "@/components/GuestCheckoutModal";
import {
  requestPortOnePayment,
  recallUnlockToken,
  forgetUnlockToken,
  subscribeUnlockToken,
  BuyerInfo,
} from "@/lib/payments/client";

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
}

export default function CompatResultClient({ initialData, locale, refToken, isPremium }: CompatResultClientProps) {
  const [data] = useState<CompatData>(initialData);
  const [summary, setSummary] = useState<string | null>(initialData.summaryKo);
  const [isGenerating, setIsGenerating] = useState<boolean>(!initialData.summaryKo);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  
  const [deepReport, setDeepReport] = useState<DeepReportContent | null>(null);
  const [isLoadingDeepReport, setIsLoadingDeepReport] = useState(false);
  const [deepReportError, setDeepReportError] = useState<string | null>(null);

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
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutType, setCheckoutType] = useState<"SINGLE" | "PERIOD_PASS">("SINGLE");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Period Pass Selection State
  const [selectedPlan, setSelectedPlan] = useState<string>("1_MONTH");

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

  // [CLAIM UNLOCK] 로그인한 사용자이고 기기에 unlockToken(게스트 구매 토큰)이 있다면 자동으로 계정에 연동
  useEffect(() => {
    if (session?.user?.id && unlockToken && data.id) {
      const claimKey = `claimed_${data.id}_${unlockToken}`;
      if (typeof window !== "undefined" && window.sessionStorage.getItem(claimKey)) {
        return; // 이미 이번 세션에서 시도함
      }
      fetch("/api/user/claim-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compatId: data.id, orderId: unlockToken }),
      })
        .then(async (res) => {
          if (res.ok) {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem(claimKey, "true");
            }
            setCopyToast("구매하신 궁합 결과가 내 계정에 안전하게 연동되었습니다! 🎉");
            setTimeout(() => setCopyToast(null), 4000);
          }
        })
        .catch(() => {});
    }
  }, [session?.user?.id, unlockToken, data.id]);

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
    } catch (e: any) {
      console.error(e);
      setDeepReportError(e.message || "오류가 발생했습니다.");
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
    <div className="w-full max-w-md md:max-w-2xl mx-auto flex flex-col items-center pb-16">
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#2B2430] text-white px-5 py-3 rounded-full text-sm font-semibold shadow-xl transition-all duration-300 border border-[#FF8AA1]/30">
          {copyToast}
        </div>
      )}

      {/* Main Score Card */}
      <div className="w-full bg-gradient-to-br from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] rounded-3xl p-6 sm:p-8 text-white text-center shadow-lg relative overflow-hidden mt-4">
        {/* Background Sparkle Decor */}
        <div className="absolute top-4 right-4 text-[#FFC24B] text-2xl animate-pulse">✨</div>
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
            <span className="text-[10px] font-extrabold text-[#FFC24B] tracking-wider uppercase bg-black/25 px-2 py-0.5 rounded-full mt-0.5">
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
            <span className="text-6xl sm:text-7xl font-black tracking-tight drop-shadow-md">
              {data.score}
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#FFC24B]">점</span>
          </div>
        </div>

        {/* Score Reaction Mood Badge */}
        <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-md text-[#FFF6F1] px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold border border-white/20 my-2 shadow-sm">
          {data.score >= 90 && "💖 심쿵주의! 천생연분 궁합"}
          {data.score >= 80 && data.score < 90 && "🔥 불꽃 케미! 찰떡호흡 궁합"}
          {data.score >= 70 && data.score < 80 && "💕 두근두근! 설레는 꿀케미"}
          {data.score >= 60 && data.score < 70 && "💧 오글오글! 매력적인 밀당 케미"}
          {data.score < 60 && "🌱 반전매력! 서로 맞춰가는 노력형 케미"}
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

      {/* AI Free Summary Section */}
      <div className="w-full bg-white rounded-2xl p-6 mt-6 shadow-sm border border-[#FFD9E0]/40">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔮</span>
          <h3 className="text-base font-bold text-[#2B2430]">우리 사이의 진짜 케미</h3>
        </div>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <KongdakMascot size={96} animate="bounce" />
            <p className="text-sm font-bold text-[#6A2C70] mt-1 animate-pulse">
              두근두근 궁합 보는 중…
            </p>
            <div className="w-full space-y-2 mt-2">
              <div className="h-3 bg-[#FFF6F1] rounded-full animate-pulse w-full" />
              <div className="h-3 bg-[#FFF6F1] rounded-full animate-pulse w-4/5 mx-auto" />
            </div>
            <p className="text-xs text-[#8A8291]">
              두 사람의 기운을 다정하게 읽고 있어요
            </p>
          </div>
        ) : (
          <div className="text-sm text-[#2B2430] leading-relaxed space-y-3 whitespace-pre-line font-medium">
            {summary}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col gap-3 mt-6">
        {/* Kakao Share Button */}
        <button
          onClick={handleKakaoShare}
          className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 active:scale-[0.99] text-black py-4 rounded-xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
            <path d="M16 4.64C8.269 4.64 2 9.697 2 15.942c0 4.024 2.502 7.55 6.275 9.624l-1.579 5.86c-.116.425.353.754.73.522l6.815-4.51c.563.078 1.144.12 1.749.12 7.73 0 14-5.057 14-11.302S23.73 4.64 16 4.64z"/>
          </svg>
          <span>카카오톡으로 결과 공유하기</span>
        </button>

        {/* Share Link Button */}
        <button
          onClick={handleShareLink}
          className="w-full bg-gradient-to-r from-[#FF8AA1] to-[#FF5C77] hover:opacity-95 active:scale-[0.99] text-white py-4 rounded-xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2"
        >
          <span>🔗</span>
          <span>링크 복사하기</span>
        </button>

        {/* Download Story Card Button */}
        <button
          onClick={handleDownloadCard}
          className="w-full bg-white border-2 border-[#FF5C77] text-[#FF5C77] hover:bg-[#FFF6F1] active:scale-[0.99] py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          <span>📸</span>
          <span>인스타 스토리 카드 다운로드 (1080×1350)</span>
        </button>
      </div>

      {/* Premium Section */}
      {deepReport ? (
        <div className="w-full mt-8 flex flex-col gap-6">
          <div className="text-center mb-2">
            <div className="inline-block bg-[#6A2C70] text-[#FFC24B] text-xs font-black px-4 py-1.5 rounded-full shadow-md uppercase tracking-widest">
              Premium Reading
            </div>
            <p className="text-[11px] text-[#8A8291] mt-1.5 font-medium">
              열람 유효기간: 결제일로부터 90일간 이용 가능
            </p>
          </div>
          
          <div className="w-full bg-white rounded-2xl p-6 shadow-md border-t-4 border-[#6A2C70]">
            <h3 className="text-lg font-black text-[#6A2C70] mb-3">🔮 우리 관계의 핵심 에너지</h3>
            <p className="text-sm text-[#2B2430] leading-relaxed font-medium">{deepReport.coreDynamic}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-white rounded-2xl p-6 shadow-md border-l-4 border-[#FF8AA1]">
              <h3 className="text-base font-black text-[#FF5C77] mb-3">✨ 시너지 강점</h3>
              <ul className="text-sm text-[#2B2430] leading-relaxed space-y-2 font-medium list-disc list-inside">
                {deepReport.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="flex-1 bg-white rounded-2xl p-6 shadow-md border-l-4 border-gray-400">
              <h3 className="text-base font-black text-gray-700 mb-3">⚠️ 주의할 점</h3>
              <ul className="text-sm text-[#2B2430] leading-relaxed space-y-2 font-medium list-disc list-inside">
                {deepReport.cautions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>

          <div className="w-full bg-[#FFF6F1] rounded-2xl p-6 shadow-md border border-[#FFD9E0]/50">
            <h3 className="text-lg font-black text-[#FF5C77] mb-4 text-center">🔥 갈등 포인트 & 대처법</h3>
            <div className="space-y-4">
              {deepReport.conflictsAndSolutions.map((cs, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="font-bold text-[#6A2C70] text-sm mb-1">Q. {cs.trigger}</div>
                  <div className="text-sm text-[#2B2430] font-medium leading-relaxed pl-4 border-l-2 border-[#FFC24B] bg-[#FFF6F1]/30 p-2 rounded-r-md">
                    {cs.solution}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full bg-white rounded-2xl p-6 shadow-md border-t-4 border-[#FFC24B]">
            <h3 className="text-base font-black text-[#2B2430] mb-3">💡 연애 조언 & 애정운</h3>
            <p className="text-sm text-[#2B2430] leading-relaxed font-medium mb-4">{deepReport.actionableAdvice}</p>
            <div className="bg-[#FFF6F1] p-4 rounded-xl text-sm text-[#6A2C70] font-bold">
              이번 달 애정운: {deepReport.monthlyFortune}
            </div>
          </div>

          <div className="w-full bg-gradient-to-r from-[#FF8AA1]/10 to-[#6A2C70]/10 rounded-2xl p-6 shadow-sm border border-[#FF5C77]/20 text-center">
            <span className="text-2xl mb-2 block">💘</span>
            <h3 className="text-base font-black text-[#6A2C70] mb-2">나와 찰떡인 이상형 사주 기운</h3>
            <p className="text-sm font-bold text-[#FF5C77] mb-1">{deepReport.idealMatchEnergy.energyName}</p>
            <p className="text-xs text-[#2B2430] font-medium leading-relaxed">{deepReport.idealMatchEnergy.traits}</p>
          </div>

          {/* Guest Retention & Account Binding Banner */}
          {!session?.user?.id && (
            <div className="w-full bg-[#FFF0F3] border border-[#FFD9E0] rounded-2xl p-5 text-left shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#FF5C77]">
                <span>💡</span>
                <span>비회원 결과 보관 안내</span>
              </div>
              <p className="text-xs text-[#6A5E72] leading-relaxed mb-4">
                현재 사용 중인 브라우저에 열람 권한이 보관되어 있습니다. 기기를 바꾸거나 캐시를 지워도 언제든 다시 보려면 링크를 복사해 두시거나, 무료 회원가입으로 내 계정에 안전하게 저장해 두세요!
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleShareLink}
                  className="flex-1 bg-white border border-[#FFD9E0] text-[#6A2C70] py-2.5 px-3 rounded-xl text-xs font-bold shadow-sm hover:bg-[#FFF6F1] transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>🔗 결과 링크 복사하기</span>
                </button>
                <a
                  href={`/${locale}/login?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : `/${locale}/compat/${data.shareToken}`)}`}
                  className="flex-1 bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white py-2.5 px-3 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-1.5 active:scale-95 text-center"
                >
                  <span>✨ 3초 가입하고 결과 영구 저장</span>
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full bg-gradient-to-br from-[#FFF6F1] to-[#FFD9E0]/50 border border-[#FF8AA1]/40 rounded-2xl p-6 mt-8 text-center relative overflow-hidden shadow-sm">
          <div className="inline-block bg-[#6A2C70] text-[#FFC24B] text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            Special Reading
          </div>
          <h4 className="text-lg font-black text-[#2B2430] mb-2">
            우리 관계의 진짜 갈등 포인트와<br/>현실적인 연애 조언이 궁금하다면?
          </h4>
          <p className="text-sm text-[#8A8291] mb-6 font-medium">
            서로에게 끌리는 진짜 이유와 타이밍까지<br/>AI가 분석한 심층 궁합 리포트를 만나보세요.
          </p>
          
          {isPremium || unlockToken ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleGenerateDeepReport}
                disabled={isLoadingDeepReport}
                className="w-full bg-gradient-to-r from-[#FF8AA1] to-[#6A2C70] hover:opacity-95 text-white py-4 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
              >
                {isLoadingDeepReport ? "리포트 생성 중..." : "✨ 콩닥 플러스: 심층 리포트 즉시 열람"}
              </button>
              {deepReportError && <p className="text-xs text-red-500 mt-1">{deepReportError}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-[#FFF6F1]/80 text-[#6A2C70] font-bold p-3 rounded-lg text-sm mb-2 border border-[#FFD9E0]">
                🔒 이 커플의 갈등 포인트 3개와 관계 조언이 준비됐어요
              </div>
              <button
                onClick={() => {
                  setCheckoutType("SINGLE");
                  setCheckoutModalOpen(true);
                }}
                className="w-full bg-white border-2 border-[#FF5C77] text-[#FF5C77] hover:bg-[#FFF6F1] py-4 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
              >
                잠금 해제 · 2,900원(첫 결제 1,900원)
              </button>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#FFD9E0]/50 flex flex-col gap-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#2B2430]">콩닥 플러스 패스 (무제한 열람)</span>
                  <select 
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="bg-[#FFF6F1] text-[#6A2C70] border border-[#FF8AA1]/30 rounded-lg text-sm font-bold p-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF5C77]"
                  >
                    <option value="1_MONTH">1개월 패스 (9,900원)</option>
                    <option value="3_MONTHS">3개월 패스 (24,900원)</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (!session?.user?.id) {
                      alert("패스권 구매는 로그인이 필요합니다.");
                      window.location.href = `/${locale}/login?callbackUrl=${encodeURIComponent(window.location.href)}`;
                      return;
                    }
                    setCheckoutType("PERIOD_PASS");
                    setCheckoutModalOpen(true);
                  }}
                  className="w-full bg-gradient-to-r from-[#FF8AA1] to-[#6A2C70] hover:opacity-95 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                >
                  패스권 결제하기
                </button>
              </div>
              <p className="text-[11px] text-[#8A8291] mt-1">모든 심층 궁합 무료 + 매주 맞춤 운세 배달</p>
            </div>
          )}
        </div>
      )}

      {/* Guest & Pass Checkout Modal */}
      <GuestCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title={checkoutType === "SINGLE" ? "심층 궁합 리포트 잠금 해제" : "콩닥 플러스 무제한 이용권"}
        orderName={
          checkoutType === "SINGLE"
            ? "콩닥 심층 궁합 리포트"
            : selectedPlan === "1_MONTH"
            ? "콩닥 플러스 1개월 이용권"
            : "콩닥 플러스 3개월 이용권"
        }
        priceLabel={
          checkoutType === "SINGLE"
            ? "2,900원 (첫 결제 1,900원)"
            : selectedPlan === "1_MONTH"
            ? "9,900원"
            : "24,900원"
        }
        initialName={session?.user?.name || ""}
        initialEmail={session?.user?.email || ""}
        initialPhone=""
        isLoading={isProcessingPayment}
        onSubmit={async (buyer) => {
          try {
            setIsProcessingPayment(true);
            await requestPortOnePayment({
              type: checkoutType,
              planId: checkoutType === "PERIOD_PASS" ? (selectedPlan as "1_MONTH" | "3_MONTHS") : undefined,
              compatId: data.id,
              buyer,
              locale,
            });
          } catch (e: any) {
            alert(e.message || "결제 진행 중 오류가 발생했습니다.");
          } finally {
            setIsProcessingPayment(false);
            setCheckoutModalOpen(false);
          }
        }}
      />


      {/* New Test CTA */}
      <div className="mt-8 text-center">
        <a
          href={refToken ? `/${locale}/compat/new?ref=${encodeURIComponent(refToken)}` : `/${locale}/compat/new`}
          className="text-xs font-semibold text-[#8A8291] hover:text-[#FF5C77] underline underline-offset-4 transition-colors"
        >
          다른 사람과의 궁합도 새로 알아보기 →
        </a>
      </div>
    </div>
  );
}
