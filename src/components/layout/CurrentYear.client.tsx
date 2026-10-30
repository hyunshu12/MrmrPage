'use client';

import { useEffect, useState } from 'react';

/**
 * 올해 연도. 페이지는 빌드 때 정적으로 만들어져 서버에서 계산한 값이 빌드한 해에 멈춘다.
 * 하이드레이션은 서버가 넘긴 값으로 맞춰 경고가 없게 하고, 마운트한 뒤 방문자의 시계로 바꾼다.
 */
export default function CurrentYear({ serverYear }: { serverYear: number }) {
  const [year, setYear] = useState(serverYear);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <>{year}</>;
}
