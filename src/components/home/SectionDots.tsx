interface SectionDotsProps {
  labels: readonly string[];
  active: number;
  onSelect: (index: number) => void;
}

/**
 * 홈 우측의 섹션 인디케이터. 지금 몇 번째 화면인지 보여주고, 누르면 그 섹션으로 이동한다.
 *
 * 1360px 이상에서만 보인다. 본문 컨테이너(max-w-7xl)의 바깥 여백이 생기는 폭이라,
 * 그보다 좁으면 점이 본문 이미지·텍스트 위에 겹친다.
 */
export default function SectionDots({ labels, active, onSelect }: SectionDotsProps) {
  return (
    <nav
      aria-label="섹션 이동"
      className="intro-chrome-fade fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 min-[1360px]:block">
      <ul className="flex flex-col items-end gap-1">
        {labels.map((label, index) => {
          const isActive = index === active;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-label={`${label} 섹션으로 이동`}
                aria-current={isActive ? 'true' : undefined}
                className="group flex items-center gap-2.5 py-1.5 pl-3 outline-none">
                <span className="translate-x-1 rounded-full bg-white/75 px-2 py-0.5 text-xs font-semibold tracking-wide text-muruk-green-darker opacity-0 shadow-sm backdrop-blur-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                  {label}
                </span>
                <span
                  className={`block w-1.5 rounded-full transition-all duration-500 ease-out group-focus-visible:ring-2 group-focus-visible:ring-muruk-green-primary/40 group-focus-visible:ring-offset-2 ${
                    isActive
                      ? 'h-7 bg-muruk-green-primary'
                      : 'h-1.5 bg-muruk-green-primary/30 group-hover:bg-muruk-green-primary/60'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
