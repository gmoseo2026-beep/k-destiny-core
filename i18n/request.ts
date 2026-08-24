import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
import koMessages from '../messages/ko.json';

type Messages = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Messages =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * 동면 로케일(en/ja/es/de/fr)의 번역문은 전부 개편 이전에 작성된 것이라
 * 콩닥으로 바뀐 화면에서는 옛 브랜드 문구를 그대로 노출한다.
 * 게다가 NextIntlClientProvider 는 메시지 번들 "전체"를 HTML(RSC 페이로드)에
 * 직렬화하므로, ko 에서 지운 네임스페이스라도 동면 로케일 JSON 에 남아 있으면
 * /en/* 페이지 소스에 그대로 실려 크롤러에 노출된다(실측 30건/페이지).
 *
 * 그래서 병합 규칙을 "ko 가 정본"으로 뒤집는다.
 *   1) ko 에 없는 키·네임스페이스는 로케일 값이 있어도 버린다 → 폐기 문구가 실릴 수 없다.
 *   2) KO_CANONICAL_NAMESPACES 는 로케일 값을 아예 받지 않는다 → 콩닥으로 새로 쓴
 *      문구가 옛 번역으로 덮이지 않는다.
 *   3) 그 외 키는 번역이 있으면 쓰고, 없으면 ko 문안으로 채운다.
 *
 * 동면 로케일 JSON 파일 자체는 손대지 않는다(재개 시 그대로 사용).
 * 각 네임스페이스의 콩닥 번역이 준비되면 아래 목록에서 이름을 빼면 즉시 되살아난다.
 */
const KO_CANONICAL_NAMESPACES = new Set([
  'Dashboard',
  'Guide',
  'Footer',
  'Login',
  'Legal',
]);

/**
 * base(ko)의 키 집합 안에서만 override 값을 받아들인다.
 * base 에 없는 키는 결과에 포함되지 않는다.
 */
function mergeWithinKoShape(base: Messages, override: Messages): Messages {
  const out: Messages = {};
  for (const [key, baseValue] of Object.entries(base)) {
    const overrideValue = override[key];
    if (isPlainObject(baseValue)) {
      out[key] = isPlainObject(overrideValue)
        ? mergeWithinKoShape(baseValue, overrideValue)
        : baseValue;
    } else {
      out[key] = overrideValue === undefined ? baseValue : overrideValue;
    }
  }
  return out;
}

export default getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  if (locale === 'ko') {
    return {locale, messages: koMessages as Messages};
  }

  const localeMessages = (await import(`../messages/${locale}.json`)).default as Messages;

  const usableOverride: Messages = {};
  for (const [ns, value] of Object.entries(localeMessages)) {
    if (KO_CANONICAL_NAMESPACES.has(ns)) continue;
    usableOverride[ns] = value;
  }

  return {
    locale,
    messages: mergeWithinKoShape(koMessages as Messages, usableOverride)
  };
});
