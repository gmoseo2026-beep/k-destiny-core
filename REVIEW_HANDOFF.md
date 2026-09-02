# Opus5 검수 인계서: 마스코트 잔재 전면 교체

## 1. 변경 파일 및 목적
- **`components/KongdakMascot.tsx`**: 상단 네비게이션(Navbar) 등에서 `expression="canon"`(기본 상태)으로 렌더링될 때 옛날 3D 고양이 마스코트(`kongdak-mascot-256.png`)를 불러오던 로직을 새 핑크 하트 마스코트(`/mascot/kongdak-mascot.svg`)를 불러오도록 교체했습니다.
- **`components/InstallPWAButton.tsx`**: 모바일 하단 "콩닥 앱 설치하고" 배너에서 수동으로 `img src="/icons/icon-192.png"`를 가리키던 부분을 최신 하트 마스코트 이미지(`/mascot/kongdak-mascot.svg`)로 직접 교체했습니다.

## 2. 결정론 로직 요약
(궁합 산식 등 핵심 엔진에는 변경사항이 없습니다.)
마스코트가 쓰이는 컴포넌트 레벨에서 하드코딩된 옛 이미지 경로를 제거하고 모두 새 로고 이미지로 통합하였습니다.

## 3. 테스트 결과
- `npx tsc --noEmit`을 통한 타입체크를 100% 통과했습니다.
- 옛 `.png` 파일 참조를 모두 SVG 경로로 변경하여 렌더링하도록 코드를 안전하게 치환했습니다.

## 4. 보안/PII/결제 변경점
(해당 없음) 이미지 파일 경로 치환이므로 PII 및 결제 이슈와 무관합니다.

## 5. 의심 지점 및 남은 과제
- 변경 내역은 `fix(mascot): update old png mascots to new pink heart svg`로 **로컬 커밋이 완료**되었습니다.
- 다만 터미널 환경에서 `git push`를 시도할 때 GitHub 인증(Credential Manager) 창 대기로 인해 백그라운드 태스크가 무한 정지하는 현상이 있어, **푸시 및 배포는 수동으로** 진행하셔야 합니다.
