"use client";

import React, { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/gtag";

export interface StoryCardSaveButtonProps {
  /** `/api/og/story?...` 경로 (개인정보 미포함) */
  storyUrl: string;
  /** GA4 이벤트 구분용 화면 출처 */
  source: "compat_result" | "free_personality" | "compat_teaser";
  /** 저장 파일 이름 (기본 kongdak_story_card.png — 실명·생년월일 미포함) */
  fileName?: string;
  label?: string;
  onFeedback?: (message: string) => void;
  className?: string;
}

function triggerDownloadFromUrl(href: string, fileName: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function StoryCardSaveButton({
  storyUrl,
  source,
  fileName = "kongdak_story_card.png",
  label = "스토리용 카드 저장",
  onFeedback,
  className,
}: StoryCardSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onFeedback) {
      onFeedback(msg);
      return;
    }
    setLocalNotice(msg);
    window.setTimeout(() => setLocalNotice(null), 2600);
  };

  const handleClick = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const res = await fetch(storyUrl);
      if (!res.ok) {
        throw new Error("story_card_fetch_failed");
      }
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      const isMobile =
        typeof navigator !== "undefined" &&
        (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
          (typeof window !== "undefined" &&
            Boolean(window.matchMedia?.("(pointer: coarse)").matches)));

      let canShareFiles = false;
      if (
        isMobile &&
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function"
      ) {
        try {
          canShareFiles = navigator.canShare({ files: [file] });
        } catch {
          canShareFiles = false;
        }
      }

      if (canShareFiles) {
        try {
          await navigator.share({
            files: [file],
            title: "콩닥 결과 카드",
          });
          trackEvent("story_card_share", { source, format: "story_1080x1920" });
          return;
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === "AbortError") {
            return;
          }
          // 인앱 브라우저 등에서 파일 공유 호출이 거절된 경우 다운로드로 이어간다.
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      triggerDownloadFromUrl(objectUrl, fileName);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      trackEvent("story_card_save", { source, format: "story_1080x1920" });
      notify("스토리용 카드를 저장했어요 📸");
    } catch {
      const sep = storyUrl.includes("?") ? "&" : "?";
      triggerDownloadFromUrl(`${storyUrl}${sep}download=true`, fileName);
      trackEvent("story_card_save", { source, format: "story_1080x1920" });
      notify("스토리용 카드를 저장하고 있어요 📸");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={className ? `w-full ${className}` : "w-full"}>
      <Button
        type="button"
        onClick={handleClick}
        variant="secondary"
        size="lg"
        fullWidth
        isLoading={isSaving}
        leftIcon={<Download className="h-4 w-4" />}
      >
        <span>{label}</span>
      </Button>
      {localNotice && (
        <p className="mt-2 text-center text-xs font-semibold text-[#FFC24B]">
          {localNotice}
        </p>
      )}
    </div>
  );
}
