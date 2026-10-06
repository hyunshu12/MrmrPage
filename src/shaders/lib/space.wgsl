import { Params } from "./params.wgsl";

// 일렁임의 진폭(격자 칸 단위). 키우면 물결이 커지고, 0 이면 완전히 멈춘다.
const SWAY_CELLS = 0.07;

// 저해상도 필드 패스와 본 패스가 반드시 같은 좌표계를 써야 한다.
// 한쪽만 어긋나면 흐름이 격자에서 미끄러진다. 그래서 계산을 여기 한 곳에 둔다.
export struct Space {
  aspect: f32,
  // 화면 중심 기준, 종횡비 보정 좌표
  centered: vec2f,
  // 격자 좌표 (포인터 밀림·스크롤 이동 반영)
  g: vec2f,
  // 커서 반응 세기 0..1
  wake: f32,
  // 성장 단계 0..1 (부드럽게 다듬은 scroll)
  ease: f32,
}

export fn spaceOf(p: Params, uv: vec2f) -> Space {
  var s: Space;
  s.aspect = p.width / max(p.height, 1.0);
  s.centered = vec2f((uv.x - 0.5) * s.aspect, uv.y - 0.5);

  let growth = clamp(p.scroll, 0.0, 1.0);
  s.ease = growth * growth * (3.0 - 2.0 * growth);

  // 커서 주변에서 격자가 바깥으로 아주 조금 밀린다.
  // 좁고 센 핫스팟은 커서를 움직일 때마다 번쩍여서 난잡하다. 넓고 옅게 부풀리면
  // 같은 반응이 잔물결처럼 읽힌다.
  let pointer = vec2f((p.pointerX - 0.5) * s.aspect, p.pointerY - 0.5);
  let toCursor = s.centered - pointer;
  let cursorDist = length(toCursor);
  s.wake = (1.0 - smoothstep(0.0, 0.55, cursorDist)) * p.pointerStrength;
  let push = toCursor / max(cursorDist, 1e-4) * s.wake * s.wake * 0.09;

  // 격자는 성장할수록 촘촘해지고, 스크롤을 따라 위로 흐른다.
  let cells = mix(5.5, 9.5, s.ease);
  s.g = (s.centered + push) * cells;
  s.g.y += p.scroll * cells * 0.55 - p.time * 0.012;

  // 일렁임. 격자 좌표를 낮은 주파수로 흔들어 화면 전체가 천천히 물결치게 한다.
  //
  // 시간항에 화면 좌표를 섞어서 제자리 흔들림이 아니라 가로지르는 파동으로 만든다.
  // 주기가 서로 안 맞는 두 성분을 겹치므로 같은 모양이 되돌아오는 게 보이지 않는다.
  // centered 가 아니라 g 에만 더하는 이유: centered 는 가독성 마스크(calm)와
  // 빛 무리 위치의 기준이라, 같이 흔들면 본문 뒤가 밝아졌다 어두워졌다 한다.
  let sway = vec2f(
    sin(p.time * 0.55 + s.centered.y * 2.3) + 0.6 * sin(p.time * 0.37 - s.centered.x * 1.7),
    cos(p.time * 0.47 - s.centered.x * 2.0) + 0.6 * cos(p.time * 0.31 + s.centered.y * 1.5)
  );
  // 한 칸의 1/10 남짓. 노드가 제 지름만큼 떠다녀서 구조는 그대로 읽히고 흐름만 느껴진다.
  s.g += sway * SWAY_CELLS;

  return s;
}
