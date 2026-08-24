"use client";

import React, { useState, useEffect } from "react";
import { trackEvent } from "@/lib/gtag";
import KongdakMascot from "@/components/KongdakMascot";

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
    sendDefault: (settings: {
      objectType: "feed";
      content: {
        title: string;
        description: string;
        imageUrl: string;
        link: KakaoLink;
      };
      buttons?: { title: string; link: KakaoLink }[];
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
}

export default function CompatResultClient({ initialData, locale, refToken }: CompatResultClientProps) {
  const [data] = useState<CompatData>(initialData);
  const [summary, setSummary] = useState<string | null>(initialData.summaryKo);
  const [isGenerating, setIsGenerating] = useState<boolean>(!initialData.summaryKo);
  const [copyToast, setCopyToast] = useState<string | null>(null);

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
      const origin = typeof window !== "undefined" ? window.location.origin : "https://kongdak.kr";
      const shareUrl = `${origin}/${locale}/compat/${data.shareToken}?ref=${data.shareToken}`;

      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '우리, 얼마나 잘 맞을까? 🔮',
          description: `${data.personA.name} ❤️ ${data.personB.name}의 궁합 점수는 ${data.score}점! 지금 확인해보세요.`,
          imageUrl: `${origin}/api/og/compat?shareToken=${data.shareToken}&w=800&h=400`,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '궁합 결과 보기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
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
      <div className="w-full bg-gradient-to-br from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] rounded-3xl p-8 text-white text-center shadow-lg relative overflow-hidden mt-4">
        {/* Background Sparkle Decor */}
        <div className="absolute top-4 right-4 text-[#FFC24B] text-2xl animate-pulse">✨</div>
        <div className="absolute bottom-6 left-6 text-white/20 text-4xl font-black">kongdak</div>

        {/* Kongdak Mascot Decor */}
        <div className="flex justify-center mb-2">
          <KongdakMascot size={52} animate="heartbeat" />
        </div>

        <p className="text-sm font-semibold tracking-wider text-white/90 uppercase mb-2">
          {data.personA.name} ❤️ {data.personB.name}
        </p>
        <h2 className="text-xl font-bold text-white mb-6">우리 두 사람의 궁합</h2>

        {/* Big Score */}
        <div className="flex items-baseline justify-center gap-1 my-4">
          <span className="text-7xl sm:text-8xl font-black tracking-tight drop-shadow-md">
            {data.score}
          </span>
          <span className="text-3xl font-bold text-[#FFC24B]">점</span>
        </div>

        {/* Keywords 3 Chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
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

      {/* Premium Teaser (Phase A에서는 단건 9,900원 티저만 노출, 결제 연동은 Step 2) */}
      <div className="w-full bg-gradient-to-br from-[#FFF6F1] to-[#FFD9E0]/50 border border-[#FF8AA1]/40 rounded-2xl p-5 mt-8 text-center relative overflow-hidden">
        <div className="inline-block bg-[#6A2C70] text-[#FFC24B] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
          Special Reading
        </div>
        <h4 className="text-base font-bold text-[#2B2430] mb-1">
          우리 관계의 갈등 포인트와 현실적인 연애 조언이 궁금하다면?
        </h4>
        <p className="text-xs text-[#8A8291] mb-4">
          서로에게 끌리는 진짜 이유와 타이밍까지 담긴 심층 궁합 리포트
        </p>
        <button
          disabled
          className="w-full bg-[#6A2C70]/80 text-white/90 py-3 rounded-xl font-bold text-sm cursor-not-allowed opacity-90"
        >
          심층 궁합 열람하기 (서비스 준비 중)
        </button>
      </div>

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
