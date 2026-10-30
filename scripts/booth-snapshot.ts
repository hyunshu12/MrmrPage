/**
 * 부스 오프라인 스냅샷 생성기.
 *
 * 실행 중인 서버(기본 http://127.0.0.1:3000)에서 API 데이터를 받아오고,
 * 거기 참조된 콘텐츠 이미지와 웹폰트(Pretendard)를 전부 public/booth/ 아래로 내려받는다.
 * JSON 안의 원격 이미지 URL은 로컬 경로로 치환해 다시 쓴다.
 *
 * 부스 현장에서 네트워크가 끊겨도 홈 화면이 그대로 보이게 하는 것이 목적이다.
 * 와이파이가 살아 있을 때 미리 한 번 실행해 두면 된다.
 *
 *   bun run booth:serve      # 부스 서버. 이 컴퓨터(127.0.0.1)에서만 접속된다
 *   bun run booth:snapshot   # 다른 터미널에서. 끝나면 브라우저로 http://localhost:3000/?booth=1
 *   BOOTH_ORIGIN=http://127.0.0.1:3001 bun run booth:snapshot   # 다른 포트에서 받을 때
 *
 * public/ 은 인증 없이 서빙되고 스냅샷에는 학생 이름과 사진이 들어 있다.
 * - 부스에서는 bun dev 대신 booth:serve 를 쓴다. bun dev 는 모든 네트워크에 열려 있어
 *   같은 와이파이의 다른 기기가 /booth/ 아래 파일을 그대로 받아갈 수 있다.
 * - 사진은 Sanity 가 WebP 로 새로 인코딩한 것을 받는다. 원본 사진의 EXIF(촬영 위치·기기·시각)가
 *   따라오지 않게 하려는 것이고, 저장하기 전에 메타데이터가 없는지 한 번 더 확인한다.
 *
 * 새 스냅샷은 임시 폴더에서 다 만든 뒤에만 public/booth/ 와 바꿔 끼운다.
 * 데이터·이미지·폰트 중 하나라도 실패하면 기존 스냅샷을 그대로 두고 종료 코드 1 로 끝난다.
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = process.env.BOOTH_ORIGIN ?? 'http://127.0.0.1:3000';
const OUT_DIR = path.join(process.cwd(), 'public', 'booth');
// 새 스냅샷을 만드는 곳. public/ 밖이라 서빙되지 않고 git 에도 잡히지 않는다.
// public/ 과 같은 디스크라 rename 으로 바로 바꿔 끼울 수 있다.
const WORK_DIR = path.join(process.cwd(), 'node_modules', '.cache', 'booth-snapshot');
const STAGING_DIR = path.join(WORK_DIR, 'next');
const PREVIOUS_DIR = path.join(WORK_DIR, 'previous');
const IMAGES_DIR = path.join(STAGING_DIR, 'images');
const FONTS_DIR = path.join(STAGING_DIR, 'fonts');

// Crimson Text 는 next/font 가 같은 서버에서 내려주므로 받지 않는다(BoothFonts.client.tsx 참고).
const FONT_CSS_SOURCES = [
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css',
];

// 크기를 바꿀 필요가 없는 PNG 는 Sanity 가 원본 바이트를 그대로 내려주므로, 형식을 바꿔(fm) 매번 새로 인코딩하게 한다.
// 부스 화면에서 가장 크게 그려도 이 폭이면 충분하다.
const SANITY_SNAPSHOT_PARAMS = 'w=2048&fit=max&fm=webp&q=90';

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'font/woff2': '.woff2',
  'font/woff': '.woff',
  'font/ttf': '.ttf',
  'application/font-woff2': '.woff2',
};

type Endpoint = { name: string; apiPath: string; imageField: string };

const ENDPOINTS: Endpoint[] = [
  // members 는 홈에 직접 쓰이진 않지만 /members 와, 게이트가 열린 뒤 다른 라우트 데이터를 미리 받는 AppBootGate 가 쓴다.
  // 빠뜨리면 오프라인 부스에서 멤버 페이지가 빈다.
  { name: 'members', apiPath: '/api/members', imageField: 'avatarUrl' },
  { name: 'projects', apiPath: '/api/projects', imageField: 'logoUrl' },
  { name: 'achievements', apiPath: '/api/achievements', imageField: 'thumbnailUrl' },
];

const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
  console.warn(`  ! ${message}`);
}

// 받은 내용의 형식을 따른다. Sanity 는 .png 주소로도 WebP 를 내려준다.
function extensionFor(url: string, contentType: string | null): string {
  const base = (contentType ?? '').split(';')[0].trim().toLowerCase();
  const fromPath = path.extname(new URL(url).pathname).toLowerCase();
  return EXT_BY_CONTENT_TYPE[base] ?? (fromPath.length > 1 && fromPath.length <= 6 ? fromPath : '.bin');
}

/**
 * 사진 메타데이터(EXIF·XMP·IPTC) 블록이 있으면 그 이름을 돌려준다.
 * 휴대폰 사진의 EXIF 에는 촬영 위치(GPS)가 남는다. Sanity 가 새로 인코딩하며 떼어내지만
 * 그 동작에만 기대지 않으려고 저장 직전에 컨테이너 구조를 직접 훑는다.
 */
function photoMetadata(data: Buffer): string | null {
  const ascii = (start: number, end: number) => data.toString('latin1', start, end);
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    for (let i = 12; i + 8 <= data.length; ) {
      const type = ascii(i, i + 4);
      if (type === 'EXIF' || type === 'XMP ') return `WebP ${type.trim()}`;
      const size = data.readUInt32LE(i + 4);
      i += 8 + size + (size % 2);
    }
    return null;
  }
  if (ascii(1, 4) === 'PNG') {
    for (let i = 8; i + 8 <= data.length; ) {
      const type = ascii(i + 4, i + 8);
      // XMP 도 iTXt 에 들어간다.
      if (['eXIf', 'tEXt', 'zTXt', 'iTXt'].includes(type)) return `PNG ${type}`;
      i += 12 + data.readUInt32BE(i);
    }
    return null;
  }
  if (data[0] === 0xff && data[1] === 0xd8) {
    // 영상 데이터(SOS) 앞의 세그먼트만 본다. APP1 = EXIF·XMP, APP13 = IPTC.
    for (let i = 2; i + 4 <= data.length && data[i] === 0xff && data[i + 1] !== 0xda; ) {
      if (data[i + 1] === 0xe1) return 'JPEG APP1';
      if (data[i + 1] === 0xed) return 'JPEG APP13';
      i += 2 + data.readUInt16BE(i + 2);
    }
  }
  return null;
}

function snapshotImageUrl(remote: string): string {
  const { hostname, pathname } = new URL(remote);
  // GIF(움직임)·SVG(벡터)는 그대로 받는다. 둘 다 EXIF 를 담지 않는다.
  if (hostname !== 'cdn.sanity.io' || /\.(gif|svg)$/i.test(pathname)) return remote;
  // 편집자가 크롭했으면 이미 ?rect= 가 붙어 있다.
  return `${remote}${remote.includes('?') ? '&' : '?'}${SANITY_SNAPSHOT_PARAMS}`;
}

async function download(
  url: string,
  dir: string,
  publicPrefix: string,
  verify?: (data: Buffer) => void,
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  verify?.(buffer);
  // 원본 URL 이 아니라 내용으로 해시한다. 같은 파일이면 매번 같은 이름이 나온다.
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const filename = `${hash}${extensionFor(url, res.headers.get('content-type'))}`;
  await writeFile(path.join(dir, filename), buffer);
  return `${publicPrefix}/${filename}`;
}

function rejectPhotoMetadata(data: Buffer): void {
  const found = photoMetadata(data);
  if (found) throw new Error(`사진 메타데이터(${found})가 남아 있어 저장하지 않았습니다`);
}

async function snapshotData(): Promise<void> {
  for (const endpoint of ENDPOINTS) {
    const res = await fetch(`${ORIGIN}${endpoint.apiPath}`).catch(() => null);
    if (!res?.ok) {
      throw new Error(
        `${endpoint.apiPath} 를 받지 못했습니다${res ? ` (${res.status})` : ''}. 서버가 ${ORIGIN} 에서 돌고 있는지 확인하세요.`,
      );
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;

    // 같은 이미지를 여러 행이 참조할 수 있으므로 원본 URL 기준으로 한 번만 받는다.
    const localByRemote = new Map<string, string>();
    for (const row of rows) {
      const remote = row[endpoint.imageField];
      if (typeof remote !== 'string' || remote.length === 0) continue;
      if (remote.startsWith('/')) continue; // 이미 로컬 경로
      if (!localByRemote.has(remote)) {
        try {
          localByRemote.set(
            remote,
            await download(snapshotImageUrl(remote), IMAGES_DIR, '/booth/images', rejectPhotoMetadata),
          );
        } catch (error) {
          fail(`이미지 ${remote} (${(error as Error).message})`);
          continue;
        }
      }
      row[endpoint.imageField] = localByRemote.get(remote);
    }

    await writeFile(path.join(STAGING_DIR, `${endpoint.name}.json`), JSON.stringify(rows, null, 2));
    console.log(`  ${endpoint.name}: ${rows.length}건, 이미지 ${localByRemote.size}개`);
  }
}

async function snapshotFonts(): Promise<void> {
  const cssParts: string[] = [];
  let fontCount = 0;

  for (const cssUrl of FONT_CSS_SOURCES) {
    const res = await fetch(cssUrl).catch(() => null);
    if (!res?.ok) {
      fail(`폰트 CSS ${cssUrl} (${res?.status ?? '연결 실패'})`);
      continue;
    }
    let css = await res.text();

    // url(...) 안의 원격 참조를 전부 찾아 내려받고 로컬 경로로 치환한다.
    const refs = new Set<string>();
    for (const match of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const ref = match[1].trim();
      if (ref.startsWith('data:')) continue;
      refs.add(ref);
    }

    for (const ref of refs) {
      const absolute = new URL(ref, cssUrl).toString();
      try {
        const localPath = await download(absolute, FONTS_DIR, '/booth/fonts');
        css = css.split(ref).join(localPath);
        fontCount += 1;
      } catch (error) {
        fail(`폰트 파일 ${absolute} (${(error as Error).message})`);
      }
    }

    cssParts.push(`/* ${cssUrl} */\n${css}`);
  }

  await writeFile(path.join(STAGING_DIR, 'fonts.css'), cssParts.join('\n\n'));
  console.log(`  fonts: 파일 ${fontCount}개`);
}

async function main(): Promise<void> {
  console.log(`부스 스냅샷을 만듭니다 (원본: ${ORIGIN})`);

  // 지난번에 끊긴 작업물이 있으면 치우고 처음부터 만든다. public/booth/ 는 아직 건드리지 않는다.
  await rm(WORK_DIR, { recursive: true, force: true });
  await mkdir(IMAGES_DIR, { recursive: true });
  await mkdir(FONTS_DIR, { recursive: true });

  await snapshotData();
  await snapshotFonts();
  if (failures.length > 0) {
    throw new Error(`${failures.length}건을 받지 못했습니다. 오프라인에서 빈 칸이 생기므로 바꿔 끼우지 않습니다.`);
  }
  await writeFile(
    path.join(STAGING_DIR, 'meta.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), origin: ORIGIN }, null, 2),
  );

  // 다 만든 뒤에만 바꿔 끼운다. 기존 스냅샷은 새 것이 자리를 잡은 다음에 지운다.
  const hadPrevious = existsSync(OUT_DIR);
  if (hadPrevious) await rename(OUT_DIR, PREVIOUS_DIR);
  try {
    await rename(STAGING_DIR, OUT_DIR);
  } catch (error) {
    if (hadPrevious) await rename(PREVIOUS_DIR, OUT_DIR);
    throw error;
  }
  await rm(WORK_DIR, { recursive: true, force: true });
  console.log('완료. public/booth/ 에 저장했습니다.');
}

main().catch(async (error) => {
  // 만들다 만 것만 치운다. 실패했다면 public/booth/ 는 바꿔 끼우기 전 그대로다.
  await rm(STAGING_DIR, { recursive: true, force: true });
  console.error(`스냅샷 실패: ${(error as Error).message}`);
  console.error('기존 public/booth/ 는 그대로 둡니다.');
  process.exit(1);
});
