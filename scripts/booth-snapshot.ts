/**
 * 부스 오프라인 스냅샷 생성기.
 *
 * 실행 중인 dev 서버(기본 http://localhost:3000)에서 API 데이터를 받아오고,
 * 거기 참조된 콘텐츠 이미지와 웹폰트를 전부 public/booth/ 아래로 내려받는다.
 * JSON 안의 원격 이미지 URL은 로컬 경로로 치환해 다시 쓴다.
 *
 * 부스 현장에서 네트워크가 끊겨도 홈 화면이 그대로 보이게 하는 것이 목적이다.
 * 와이파이가 살아 있을 때 미리 한 번 실행해 두면 된다.
 *
 *   bun run booth:snapshot
 *   BOOTH_ORIGIN=http://localhost:3001 bun run booth:snapshot
 */

import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = process.env.BOOTH_ORIGIN ?? 'http://localhost:3000';
const OUT_DIR = path.join(process.cwd(), 'public', 'booth');
const IMAGES_DIR = path.join(OUT_DIR, 'images');
const FONTS_DIR = path.join(OUT_DIR, 'fonts');

// 브라우저로 위장해야 Google Fonts가 woff2를 내려준다. 기본 UA로는 구형 포맷이 온다.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const FONT_CSS_SOURCES = [
  'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap',
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css',
];

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
  // members 는 홈 화면에 직접 쓰이진 않지만 AppBootGate 가 세 개를 모두 기다린다.
  // 빠뜨리면 오프라인에서 스플래시가 8초 타임아웃을 다 채우고 넘어간다.
  { name: 'members', apiPath: '/api/members', imageField: 'avatarUrl' },
  { name: 'projects', apiPath: '/api/projects', imageField: 'logoUrl' },
  { name: 'achievements', apiPath: '/api/achievements', imageField: 'thumbnailUrl' },
];

function extensionFor(url: string, contentType: string | null): string {
  const fromPath = path.extname(new URL(url).pathname).toLowerCase();
  if (fromPath.length > 1 && fromPath.length <= 6) return fromPath;
  const base = (contentType ?? '').split(';')[0].trim().toLowerCase();
  return EXT_BY_CONTENT_TYPE[base] ?? '.bin';
}

async function download(url: string, dir: string, publicPrefix: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  // 원본 URL 이 아니라 내용으로 해시한다. presigned 쿼리스트링이 매번 달라져도
  // 같은 파일이면 같은 이름이 나오고, 재실행 시 중복이 쌓이지 않는다.
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const filename = `${hash}${extensionFor(url, res.headers.get('content-type'))}`;
  await writeFile(path.join(dir, filename), buffer);
  return `${publicPrefix}/${filename}`;
}

async function snapshotData(): Promise<void> {
  for (const endpoint of ENDPOINTS) {
    const res = await fetch(`${ORIGIN}${endpoint.apiPath}`);
    if (!res.ok) {
      throw new Error(
        `${endpoint.apiPath} 응답이 ${res.status} 입니다. dev 서버가 ${ORIGIN} 에서 돌고 있는지 확인하세요.`,
      );
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;

    // 같은 이미지를 여러 행이 참조할 수 있으므로 원본 URL 기준으로 한 번만 받는다.
    const localByRemote = new Map<string, string>();
    let downloaded = 0;
    let failed = 0;

    for (const row of rows) {
      const remote = row[endpoint.imageField];
      if (typeof remote !== 'string' || remote.length === 0) continue;
      if (remote.startsWith('/')) continue; // 이미 로컬 경로
      if (!localByRemote.has(remote)) {
        try {
          localByRemote.set(remote, await download(remote, IMAGES_DIR, '/booth/images'));
          downloaded += 1;
        } catch (error) {
          failed += 1;
          console.warn(`  ! 이미지 실패 ${remote.slice(0, 70)}… (${(error as Error).message})`);
          continue;
        }
      }
      row[endpoint.imageField] = localByRemote.get(remote);
    }

    await writeFile(path.join(OUT_DIR, `${endpoint.name}.json`), JSON.stringify(rows, null, 2));
    console.log(`  ${endpoint.name}: ${rows.length}건, 이미지 ${downloaded}개${failed > 0 ? ` (실패 ${failed})` : ''}`);
  }
}

async function snapshotFonts(): Promise<void> {
  const cssParts: string[] = [];
  let fontCount = 0;

  for (const cssUrl of FONT_CSS_SOURCES) {
    const res = await fetch(cssUrl, { headers: { 'User-Agent': BROWSER_UA } });
    if (!res.ok) {
      console.warn(`  ! 폰트 CSS 실패 ${cssUrl} (${res.status})`);
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
        console.warn(`  ! 폰트 파일 실패 ${absolute.slice(0, 70)}… (${(error as Error).message})`);
      }
    }

    cssParts.push(`/* ${cssUrl} */\n${css}`);
  }

  await writeFile(path.join(OUT_DIR, 'fonts.css'), cssParts.join('\n\n'));
  console.log(`  fonts: 파일 ${fontCount}개`);
}

async function main(): Promise<void> {
  console.log(`부스 스냅샷을 만듭니다 (원본: ${ORIGIN})`);

  // 매번 처음부터 다시 만든다. 지난 회차의 만료된 이미지가 남지 않게.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(IMAGES_DIR, { recursive: true });
  await mkdir(FONTS_DIR, { recursive: true });

  await snapshotData();
  await snapshotFonts();

  await writeFile(
    path.join(OUT_DIR, 'meta.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), origin: ORIGIN }, null, 2),
  );
  console.log('완료. public/booth/ 에 저장했습니다.');
}

main().catch((error) => {
  console.error(`스냅샷 실패: ${(error as Error).message}`);
  process.exit(1);
});
