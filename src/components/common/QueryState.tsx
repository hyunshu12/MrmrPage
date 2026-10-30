'use client';

interface LoadErrorProps {
  onRetry: () => void;
  /** 다시 받아오는 중이면 버튼을 잠근다. disabled 대신 aria-disabled 라 누른 버튼에서 포커스가 빠지지 않는다. */
  retrying: boolean;
  message?: string;
  className?: string;
}

/** 데이터를 한 번도 받지 못했을 때의 안내와 다시 시도 버튼. */
export function LoadError({
  onRetry,
  retrying,
  message = '데이터를 불러오는데 실패했습니다.',
  className = '',
}: LoadErrorProps) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-card border border-red-200 bg-red-50/80 p-4 text-red-700 ${className}`}>
      <p>{message}</p>
      <button
        type="button"
        onClick={() => {
          if (!retrying) onRetry();
        }}
        aria-disabled={retrying}
        className="shrink-0 rounded-btn border border-red-300 bg-white px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-red-100 aria-disabled:cursor-wait aria-disabled:opacity-70">
        {retrying ? '다시 불러오는 중…' : '다시 시도'}
      </button>
    </div>
  );
}

/** useQuery 결과 중 이 컴포넌트가 읽는 부분. */
interface ListQuery {
  data: readonly unknown[] | undefined;
  isLoadingError: boolean;
  isFetching: boolean;
  isPaused: boolean;
  refetch: () => unknown;
}

const boxClass = 'rounded-card bg-muruk-card-bg p-12 text-center text-muruk-green-text';

/**
 * 목록 페이지에 보여줄 항목이 없을 때의 상태: 불러오는 중, 연결 대기, 실패, 비어 있음.
 * 항목이 있으면 아무것도 그리지 않는다. 백그라운드 재조회가 실패해도 받아 둔 목록은 그대로 두고 배너를 띄우지 않는다.
 */
export default function QueryState({ query, emptyText }: { query: ListQuery; emptyText: string }) {
  if (query.data) {
    return query.data.length === 0 ? <div className={boxClass}>{emptyText}</div> : null;
  }

  if (query.isLoadingError) {
    return <LoadError onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }

  // 오프라인이면 요청이 멈춰(paused) 있다가 연결되면 이어진다. 비어 있다고 말하지 않는다.
  // <output> 은 role="status" 라 보조기기가 바뀐 문구를 읽어 준다.
  return (
    <output className={`block ${boxClass}`}>{query.isPaused ? '인터넷에 연결되면 불러옵니다.' : '불러오는 중…'}</output>
  );
}
