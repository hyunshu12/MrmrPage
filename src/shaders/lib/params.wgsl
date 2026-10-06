// 두 패스(저해상도 필드 · 본 패스)가 공유하는 uniform 레이아웃.
// 한 곳에만 두어야 두 셰이더의 구조체가 어긋날 일이 없다.
// 모듈은 바인딩을 선언할 수 없으므로(VGPU-RESOLVE-MODULE-BINDING) 모양만 내보낸다.
export struct Params {
  time: f32,
  scroll: f32,
  viewFrac: f32,
  width: f32,
  height: f32,
  intensity: f32,
  pointerX: f32,
  pointerY: f32,
  // 포인터가 화면 안에 있으면 1, 나가면 0. 씬에서 부드럽게 오간다.
  pointerStrength: f32,
}
