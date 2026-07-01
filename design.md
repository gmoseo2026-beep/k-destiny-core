# K-Destiny Design & Aesthetics Guide

이 문서는 K-Destiny 프로젝트의 시각적 정체성(Visual Identity)과 UI/UX 디자인 원칙을 정의합니다. 코드를 수정하거나 새로운 페이지를 생성할 때 기존의 고급스러운 톤앤매너를 훼손하지 않기 위한 가이드라인입니다.

## 1. Visual Theme (시각적 테마)
- **Concept**: Cosmic (우주), Mystic (신비로운), Premium (고급스러운), Destiny (운명)
- **Color Palette**:
  - **Background (Void)**: 칠흑 같은 우주 공간 느낌을 주는 어두운 계열 (주로 `bg-background` 또는 `#06050e`, `#0a0a0a`)
  - **Accent (Gold)**: 운명과 고급스러움을 상징하는 금색 계열 (`#D4AF37`, `#F9D423`, `amber-400`). 텍스트 그라데이션 및 버튼에 활발히 사용.
  - **Glow (Purple/Indigo/Gold)**: 신비로움을 더하기 위한 배경 블러 조명 효과. (`mix-blend-screen`, `blur-[120px]` 등)

## 2. UI Components & Styling (핵심 컴포넌트 스타일링)

### 2.1 Glassmorphism (유리 질감)
- 프리미엄 카드, 모달 팝업, 폼 컨테이너 등은 기본적으로 Glassmorphism 디자인을 따릅니다.
- **클래스 조합 예시**: `bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]`
- 절대 불투명한 원색 박스를 지양하며, 투명도 조절(`white/5`, `white/10`)을 통해 배경의 빛 번짐(Glow)이 부드럽게 투영되도록 구성합니다.

### 2.2 Typography (서체)
- **Serif (명조/세리프 계열)**: 제목(`h1`, `h2`), 섹션 타이틀, 중요한 명리학 용어 등에 사용하여 클래식하고 영적인 분위기를 연출합니다. (`font-serif`)
- **Sans (고딕/산세리프 계열)**: 본문, 입력 폼, 안내 문구 등에 사용하여 모바일 환경에서도 뛰어난 가독성을 확보합니다. (`font-sans`)
- 텍스트에는 단순 단색보다 `bg-gradient-to-b from-white via-white/90 to-gray-500 bg-clip-text text-transparent` 같은 그라데이션을 적용하여 입체감을 부여합니다.

### 2.3 Animations (애니메이션 및 인터랙션)
- 정적인 화면을 탈피하기 위해 `framer-motion`을 전역적으로 사용합니다.
- **페이지 트랜지션**: 모든 주요 컴포넌트 진입 시 부드러운 Fade-in + Slide-up (`initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}`)을 기본으로 적용합니다.
- **Shimmer (광택 효과)**: 프리미엄을 상징하는 버튼(예: 결제 버튼, 폼 제출 버튼) 내부에는 무한 반복되는 대각선 빛 스와이프 효과를 삽입합니다.
- **Particle & Floating**: 랜딩 페이지나 과금 페이지 등 핵심 전환 페이지에서는 배경에 미세하게 떠다니는 입자(Particles)나 떠오르는(Floating) 아이콘 애니메이션을 배치하여 우주적 신비감을 더합니다.

### 2.4 Mobile First & Viewport (반응형 및 뷰포트)
- 모바일 브라우저(특히 Safari)의 하단 네비게이션 바 클리핑 현상을 방지하기 위해 전체 높이 설정 시 `vh` 대신 `dvh`(`min-h-[100dvh]`) 단위를 엄격히 사용합니다.
- 복잡한 차트나 넓은 표시는 가로 스크롤보다는 Flex/Grid 레이아웃 변경을 통해 모바일에서 세로로 깔끔하게 떨어지도록 설계합니다.

## 3. UX Writing & Icons
- 딱딱한 시스템 메시지 대신 "Unlock Your Ultimate Destiny Blueprint", "Master K-Destiny is connecting with the stars..." 와 같이 서비스 컨셉에 과몰입할 수 있는 문장(UX Writing)을 지향합니다.
- 아이콘은 `lucide-react`를 표준으로 사용하며, 단색보다는 텍스트 컬러(특히 `text-gold`)와 일치시키거나 약간의 불투명도를 주어 조화롭게 배치합니다.
