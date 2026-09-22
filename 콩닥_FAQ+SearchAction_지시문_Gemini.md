# 콩닥 GEO/AEO 보강 — FAQPage + SearchAction (Gemini 지시문)

**목표:** `/ko/guide`에 자주 묻는 질문(FAQ)을 **①화면 본문 + ②FAQPage JSON-LD** 로 추가하고, 홈 `WebSite` 스키마에 **SearchAction**을 얹는다. 검색·AI답변엔진(구글 AI개요·ChatGPT·퍼플렉시티) 노출 강화.

**절대 규칙:** 기존 metadata/robots/sitemap/JSON-LD(WebSite/Organization/WebApplication) 로직 **변경 금지, 추가만**. Prisma 무관. 완료 후 `npm run build` 통과 → 커밋 → `safe_deploy.py`. 배포 전 Cowork 프리체크.

**중요(구글 정책):** JSON-LD의 FAQ 문답은 **반드시 페이지에 실제로 보이는 텍스트와 동일**해야 함. 그래서 `/ko/guide`에 **보이는 FAQ 섹션**을 먼저 넣고, 같은 내용을 스키마로 복제한다. 화면에 없는 문답을 스키마에만 넣지 말 것.

---

## 1. `/ko/guide` — 화면에 보이는 FAQ 섹션 추가
페이지 하단(가이드 3단계 설명 아래)에 "자주 묻는 질문" 섹션 추가. 콩닥 디자인 톤(크림 배경·핑크 포인트) 유지. 아래 8문항 그대로:

**Q1. 콩닥 궁합은 어떻게 보나요?**
나와 상대방의 생년월일(+아는 경우 태어난 시간)만 넣으면 끝이에요. 두 사람의 사주를 분석해 30초 안에 궁합 점수와 우리 사이 케미 키워드, 다정한 해석을 보여드려요.

**Q2. 정말 무료인가요?**
네, 궁합 점수·케미 키워드·요약 해석은 무료예요. 관계의 갈등 포인트와 현실 연애 조언까지 담은 **심층 리포트만 유료**(단건 결제 또는 이용권)로 제공해요.

**Q3. 회원가입을 꼭 해야 하나요?**
아니요. 회원가입 없이 비회원으로 바로 궁합을 볼 수 있어요. 결과를 계정에 저장하거나 여러 궁합을 모아보고 싶을 때만 로그인하면 됩니다.

**Q4. 태어난 시간을 몰라도 되나요?**
괜찮아요. 시간을 모르면 "시간 모름"으로 진행할 수 있어요. 시간까지 알면 더 정밀한 결과가 나오지만, 몰라도 궁합 점수와 해석은 충분히 볼 수 있습니다.

**Q5. 생년월일 같은 개인정보는 안전한가요?**
네. 생년월일·태어난 시간은 그대로 저장하지 않고 **단방향 해시로만** 보관해요. 원본을 되돌릴 수 없는 형태라 안전합니다. 자세한 내용은 개인정보처리방침에서 확인하세요.

**Q6. 결과는 어떻게 저장하거나 공유하나요?**
결과 화면에서 **카카오톡 공유**나 링크 복사로 친구에게 바로 보낼 수 있어요. 로그인하면 본 궁합 기록이 내 계정에 저장돼 언제든 다시 볼 수 있습니다.

**Q7. 궁합 점수는 어떻게 계산되나요?**
전통 사주(명리) 기준으로 두 사람의 기운을 분석해 결정론적으로 점수를 냅니다. 같은 입력이면 항상 같은 결과가 나와요. 여기에 AI가 이해하기 쉬운 해석을 더해드립니다.

**Q8. 심층 리포트는 무료 결과와 뭐가 다른가요?**
무료가 "우리가 얼마나 잘 맞는지"라면, 심층 리포트는 "**왜** 끌리는지, 어떤 갈등이 생길 수 있는지, 어떻게 풀면 좋은지"까지 구체적으로 짚어줘요.

> 톤 주의: 단정적 예언이 아니라 **오락·자기이해 참고용**이라는 서비스 성격 유지(과장·확정 표현 금지).

## 2. `/ko/guide` — FAQPage JSON-LD 추가
같은 페이지에 별도 `<script type="application/ld+json">`로 위 8문항을 그대로 복제. (client component면 JSX 안에 `dangerouslySetInnerHTML`로 렌더 — 서버 HTML에 포함되면 됨.)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://kongdak.kr/ko/guide#faq",
  "mainEntity": [
    { "@type": "Question", "name": "콩닥 궁합은 어떻게 보나요?",
      "acceptedAnswer": { "@type": "Answer", "text": "나와 상대방의 생년월일(+아는 경우 태어난 시간)만 넣으면 두 사람의 사주를 분석해 30초 안에 궁합 점수와 케미 키워드, 다정한 해석을 보여드립니다." } },
    { "@type": "Question", "name": "정말 무료인가요?",
      "acceptedAnswer": { "@type": "Answer", "text": "궁합 점수·케미 키워드·요약 해석은 무료입니다. 관계의 갈등 포인트와 현실 연애 조언까지 담은 심층 리포트만 유료(단건 결제 또는 이용권)로 제공합니다." } },
    { "@type": "Question", "name": "회원가입을 꼭 해야 하나요?",
      "acceptedAnswer": { "@type": "Answer", "text": "아니요. 비회원으로 바로 궁합을 볼 수 있습니다. 결과를 계정에 저장하거나 여러 궁합을 모아보고 싶을 때만 로그인하면 됩니다." } },
    { "@type": "Question", "name": "태어난 시간을 몰라도 되나요?",
      "acceptedAnswer": { "@type": "Answer", "text": "괜찮습니다. 시간을 모르면 '시간 모름'으로 진행할 수 있습니다. 시간까지 알면 더 정밀하지만, 몰라도 궁합 점수와 해석은 볼 수 있습니다." } },
    { "@type": "Question", "name": "생년월일 같은 개인정보는 안전한가요?",
      "acceptedAnswer": { "@type": "Answer", "text": "생년월일·태어난 시간은 원본으로 저장하지 않고 단방향 해시로만 보관합니다. 되돌릴 수 없는 형태라 안전하며, 자세한 내용은 개인정보처리방침에서 확인할 수 있습니다." } },
    { "@type": "Question", "name": "결과는 어떻게 저장하거나 공유하나요?",
      "acceptedAnswer": { "@type": "Answer", "text": "결과 화면에서 카카오톡 공유나 링크 복사로 바로 보낼 수 있고, 로그인하면 본 궁합 기록이 계정에 저장돼 언제든 다시 볼 수 있습니다." } },
    { "@type": "Question", "name": "궁합 점수는 어떻게 계산되나요?",
      "acceptedAnswer": { "@type": "Answer", "text": "전통 사주(명리) 기준으로 두 사람의 기운을 분석해 결정론적으로 점수를 냅니다. 같은 입력이면 항상 같은 결과가 나오며, 여기에 AI 해석을 더합니다." } },
    { "@type": "Question", "name": "심층 리포트는 무료 결과와 무엇이 다른가요?",
      "acceptedAnswer": { "@type": "Answer", "text": "무료가 '얼마나 잘 맞는지'라면, 심층 리포트는 왜 끌리는지, 어떤 갈등이 생길 수 있는지, 어떻게 풀면 좋은지까지 구체적으로 짚어줍니다." } }
  ]
}
```

## 3. 홈 `WebSite` 스키마에 SearchAction 추가
`app/[locale]/layout.tsx`의 기존 `jsonLd` @graph 안 **WebSite 노드에만** `potentialAction` 추가(다른 노드·필드 변경 금지):
```ts
"potentialAction": {
  "@type": "SearchAction",
  "target": {
    "@type": "EntryPoint",
    "urlTemplate": `${BASE_URL}/ko/compat/new`
  },
  "query-input": "required name=search_term_string"
}
```

## 검증
1. `npm run build` 통과 → 변경 파일 목록 보고.
2. 커밋 → `safe_deploy.py`(Deploy VERIFIED). 배포 전 Cowork 프리체크.
3. 배포 후 확인: `/ko/guide` 화면에 FAQ 보임 + 페이지 소스에 FAQPage JSON-LD 존재 + 홈 소스 WebSite에 SearchAction 존재. (구글 리치결과 테스트 https://search.google.com/test/rich-results 로 `/ko/guide` 검사하면 FAQ 인식 확인 가능)
