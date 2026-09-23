# 서드파티 데이터 고지 (작명 데이터)

## Korean-Name-Hanja-Charset — `data-naver.json`

- 저장소: https://github.com/rutopio/Korean-Name-Hanja-Charset
- 파일: `https://raw.githubusercontent.com/rutopio/Korean-Name-Hanja-Charset/main/data-naver.json`
- 기준 커밋(main): `12df1ba1b4dfaa095813e4ddfba424e816f94c53` (2024-08-14)
- 조회일: 2026-09-23 · 파일 크기: 2,048,048 바이트
- 사용처: `scripts/naming/prepare_data.py` → `data/naming/name-hanja.source.json` → `data/naming/name-hanja.json` (글자별 훈·음)
- **훈음 원출처: 네이버 한자사전(수집 데이터).** 저장소 코드는 아래 MIT 라이선스이며, 훈음 자체의 권리는 원출처에 있습니다.

### MIT License

```
MIT License

Copyright (c) 2024 ChingRu (rutopio@github)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Unicode Unihan Database

- 파일: `https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip` (`kRSUnicode`, `kTotalStrokes`, `kHangul`)
- 사용처: 부수·획수(원획·자원오행 계산), 여러 음을 가진 글자의 대표 음 선택
- 라이선스: Unicode License v3 — https://www.unicode.org/license.txt

## 대법원 인명용 한자

- `data/naming/inmyong-hanja.txt` — 대법원 인명용 한자표(공공 정보). 출생신고 전 전자가족관계등록시스템에서 최종 확인이 필요합니다.
