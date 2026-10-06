"""
인트로 하프톤용 로고 거리장(SDF) 텍스처를 만든다.

    python3 scripts/intro/gen-logo-sdf.py      # numpy · scipy · pillow 필요

public/logo.png 를 읽어 public/intro/logo-sdf.png (512×256) 를 쓴다. 로고가 바뀌면 다시 돌린다.

  왼쪽 256×256  R: 가운데 잎   G: 옆 잎 2장   B: 아래 잎 2장
  오른쪽 256×256  R: 육각형 실루엣 (잎 포함, 아래 언덕 호 제외)

좌표는 셰이더의 "마크 공간"이다. 원점은 육각형 축(x=1507px)과 이미지 세로 중심,
단위 1 은 이미지 가로 폭의 절반(1511px). 텍스처는 [-1.12, 1.12]² 를 덮는다.
값 = 128 + d / 0.25 × 127 (d 는 마크 단위 부호 거리, 안쪽이 음수).
셰이더 상수(halftone-renderer.ts 의 SDF_*)와 반드시 같아야 한다.
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "logo.png"
OUT = ROOT / "public" / "intro" / "logo-sdf.png"

AXIS_X, CENTER_Y, UNIT = 1507.0, 1502.5, 1511.0
DOMAIN = 1.12
RANGE = 0.25
SIZE = 256
DOWNSAMPLE = 2  # 거리 계산 해상도. 2px 오차는 마크 단위로 0.0013 이라 무시할 만하다.
PAD = 260  # 텍스처 영역이 이미지 밖으로 나가는 만큼 여백을 둔다.


def signed_distance(mask: np.ndarray) -> np.ndarray:
    """원본 해상도 마스크 → 축소 + 여백을 둔 부호 거리(px, 원본 기준)."""
    h, w = mask.shape
    small = mask[: h - h % DOWNSAMPLE, : w - w % DOWNSAMPLE]
    small = small.reshape(h // DOWNSAMPLE, DOWNSAMPLE, w // DOWNSAMPLE, DOWNSAMPLE).mean(axis=(1, 3)) > 0.5
    pad = PAD // DOWNSAMPLE
    small = np.pad(small, pad)
    outside = ndimage.distance_transform_edt(~small)
    inside = ndimage.distance_transform_edt(small)
    return (outside - inside) * DOWNSAMPLE


def sample(sdf: np.ndarray) -> np.ndarray:
    """마크 공간 격자의 텍셀 중심마다 부호 거리를 읽어 0..255 로 인코딩한다."""
    q = -DOMAIN + (np.arange(SIZE) + 0.5) * (2 * DOMAIN / SIZE)
    qx, qy = np.meshgrid(q, q)
    px = (AXIS_X + qx * UNIT + PAD) / DOWNSAMPLE
    py = (CENTER_Y + qy * UNIT + PAD) / DOWNSAMPLE
    d = ndimage.map_coordinates(sdf, [py, px], order=1, mode="nearest") / UNIT
    return np.clip(np.round(128 + d / RANGE * 127), 0, 255).astype(np.uint8)


def main() -> None:
    rgba = np.asarray(Image.open(SRC).convert("RGBA")).astype(np.int32)
    r, g, b, a = (rgba[..., i] for i in range(4))
    white = (r > 235) & (g > 235) & (b > 235) & (a > 200)

    labels, count = ndimage.label(white)
    edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    leaves = [i for i in range(1, count + 1) if i not in edge and (labels == i).sum() > 2000]
    tops = {i: np.nonzero(labels == i)[0].min() for i in leaves}
    assert len(leaves) == 5, f"잎이 5장이어야 하는데 {len(leaves)}장 찾았다"

    by_row = sorted(leaves, key=lambda i: tops[i])
    center, side, lower = [by_row[0]], by_row[1:3], by_row[3:5]

    def mask_of(ids: list[int]) -> np.ndarray:
        return np.isin(labels, ids)

    leaf_panel = np.stack([sample(signed_distance(mask_of(ids))) for ids in (center, side, lower)], axis=-1)
    hex_r = sample(signed_distance(a > 128))
    hex_panel = np.stack([hex_r, np.full_like(hex_r, 128), np.full_like(hex_r, 128)], axis=-1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.concatenate([leaf_panel, hex_panel], axis=1)).save(OUT, optimize=True)
    print(f"{OUT.relative_to(ROOT)}  {OUT.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
