/**
 * 부스 전시 모드 판별.
 *
 * `?booth=1` 로 접속했을 때만 켜진다. 켜지면 데이터와 폰트를 네트워크가 아니라
 * public/booth/ 아래의 로컬 스냅샷에서 읽으므로 와이파이가 끊겨도 화면이 유지된다.
 * 스냅샷은 `bun run booth:snapshot` 으로 미리 만들어 둔다.
 */

export const BOOTH_DATA_BASE_URL = '/booth';

/**
 * 브라우저에서만 의미가 있다. 서버 렌더 중에는 항상 false 를 반환하므로
 * SSR 결과와 첫 클라이언트 렌더가 어긋나지 않는다.
 */
export function isBoothMode(): boolean {
  if (typeof window === 'undefined') return false;
  const value = new URLSearchParams(window.location.search).get('booth');
  return value !== null && value !== '0' && value !== 'false';
}
