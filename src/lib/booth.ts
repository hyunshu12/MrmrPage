/**
 * 부스 전시 모드 판별.
 *
 * `?booth=1` 로 연 페이지에서만 켜진다. 켜지면 데이터와 폰트를 네트워크가 아니라
 * public/booth/ 아래의 로컬 스냅샷에서 읽으므로 와이파이가 끊겨도 화면이 유지된다.
 * 스냅샷은 `bun run booth:snapshot` 으로 미리 만들어 둔다.
 *
 * public/booth/ 는 git 에 올리지 않아 배포 사이트에는 없다. 부스는 로컬 서버로 띄운다.
 */

export const BOOTH_DATA_BASE_URL = '/booth';

interface BoothSettings {
  enabled: boolean;
  /** ?dwell= 로 정한 섹션당 체류 시간(초). 없거나 잘못된 값이면 null. */
  dwellSeconds: number | null;
}

let settings: BoothSettings | undefined;

/**
 * 페이지를 처음 열 때의 주소로 한 번 정한다. 링크로 다른 페이지에 가면 주소에서 ?booth·?dwell 이 빠지지만,
 * 같은 페이지 로드 안에서는 계속 부스 데이터·부스 저장소와 처음 정한 체류 시간을 쓴다.
 */
function boothSettings(): BoothSettings {
  if (settings === undefined) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('booth');
    const dwell = Number(params.get('dwell'));
    settings = {
      enabled: value !== null && value !== '0' && value !== 'false',
      dwellSeconds: Number.isFinite(dwell) && dwell > 0 ? dwell : null,
    };
  }
  return settings;
}

/**
 * 서버에서는 항상 false 다. 렌더 결과를 바꾸는 데 쓰면 하이드레이션이 어긋나므로
 * effect 나 데이터 요청에서만 쓴다.
 */
export function isBoothMode(): boolean {
  if (typeof window === 'undefined') return false;
  return boothSettings().enabled;
}

/** 부스 자동 순환의 섹션당 체류 시간(초). 부스 여부처럼 처음 연 주소로 정해진다. 서버에서는 null. */
export function boothDwellSeconds(): number | null {
  if (typeof window === 'undefined') return null;
  return boothSettings().dwellSeconds;
}
