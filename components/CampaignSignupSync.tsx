"use client";

// 제휴 배너(/go/<코드>)를 누른 뒤 가입한 사람이면, 로그인 직후 서버가 그 계정에 유입 표시를 남기게 한다.
// 배너 쿠키는 서버만 읽을 수 있어서(httpOnly) 여기서는 "확인해 달라"고만 부른다 — 탭마다 한 번.
// GA4: signup_from_campaign {} (실제로 남았을 때만)
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { trackEvent } from "@/lib/gtag";

const DONE_KEY = "kongdak_src_checked";

export default function CampaignSignupSync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      if (window.sessionStorage.getItem(DONE_KEY)) return;
      window.sessionStorage.setItem(DONE_KEY, "1");
    } catch {
      // 저장소를 못 쓰면 매번 확인한다(서버가 중복을 막는다)
    }
    fetch("/api/user/attribution", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.attributed) trackEvent("signup_from_campaign", {});
      })
      .catch(() => {});
  }, [status]);

  return null;
}
