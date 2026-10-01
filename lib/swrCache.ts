// lib/swrCache.ts — 서버 메모리 "일단 보여 주고 뒤에서 새로 고침" 캐시
//
// 서버(프랑스)와 DB(미국)가 멀어서, 방문이 뜸하면 페이지를 그릴 때마다 DB 재연결에 1초 가까이 걸렸다.
// 공개 화면에 쓰는 느슨한 값(상품 공개 여부·홈 순위·방문자 수)은 한 번 읽어 둔 값을 바로 돌려주고,
// 오래됐으면 응답과 상관없이 뒤에서 새로 읽는다. 결제·권한처럼 정확해야 하는 값에는 쓰지 않는다.

interface Entry<T> {
  value: T;
  fetchedAt: number;
  refreshing: Promise<void> | null;
}

const store = new Map<string, Entry<unknown>>();

/**
 * @param key   캐시 이름
 * @param ttlMs 이 시간이 지나면 뒤에서 새로 읽는다(그동안은 이전 값을 돌려준다)
 * @param load  실제 조회. 실패하면 이전 값을 유지한다(처음부터 실패하면 그대로 던진다)
 */
export async function swrCached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (!hit) {
    const value = await load();
    store.set(key, { value, fetchedAt: Date.now(), refreshing: null });
    return value;
  }
  if (Date.now() - hit.fetchedAt > ttlMs && !hit.refreshing) {
    hit.refreshing = load()
      .then((value) => {
        hit.value = value;
        hit.fetchedAt = Date.now();
      })
      .catch((e) => {
        console.warn(`[swrCache:${key}] 새로 고침 실패, 이전 값을 유지합니다:`, e instanceof Error ? e.message : e);
        // 실패가 이어져도 매 요청마다 다시 시도하지 않게 시각만 갱신한다
        hit.fetchedAt = Date.now();
      })
      .finally(() => {
        hit.refreshing = null;
      });
  }
  return hit.value;
}

export function swrInvalidate(key: string): void {
  store.delete(key);
}
