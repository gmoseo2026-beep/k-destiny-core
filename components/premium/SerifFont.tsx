// 프리미엄 화면 전용 명조 글꼴(.font-serif-kr). 이 컴포넌트가 그려지는 화면에서만 글꼴 CSS 를 받는다.
// 전역 레이아웃이나 next/font 로 불러오면 같은 경로(/products/[id])의 일반 상품 화면까지
// 글꼴 정의 249개(CSS 155KB)를 받게 된다. React 가 같은 href 의 <link> 는 한 번만 넣는다.
export function SerifFont() {
  return (
    // eslint-disable-next-line @next/next/no-page-custom-font -- 프리미엄 화면에서만 받도록 일부러 이렇게 둔다
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&display=swap"
      precedence="default"
    />
  );
}
