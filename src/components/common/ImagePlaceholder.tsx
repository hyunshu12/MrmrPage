interface ImagePlaceholderProps {
  emoji: string;
  /** 배경·이모지 톤. 카드마다 쓰던 톤을 그대로 넘긴다. */
  className?: string;
}

/**
 * 이미지가 없거나 불러오지 못했을 때 그 자리를 채우는 이모지 상자.
 * 부모의 비율 상자를 꽉 채우므로 카드 높이가 그대로 유지된다.
 */
export default function ImagePlaceholder({ emoji, className = '' }: ImagePlaceholderProps) {
  return (
    <div aria-hidden="true" className={`flex h-full w-full items-center justify-center text-5xl ${className}`}>
      {emoji}
    </div>
  );
}
