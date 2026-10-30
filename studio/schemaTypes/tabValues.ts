/**
 * 사이트는 기수·연도 값이 글자까지 같은 문서끼리 한 탭으로 묶는다.
 * '3 기'·'2025년' 같은 표기 하나로 탭이 둘로 갈라지지 않게 형식을 고정한다.
 * 지금 발행된 값(1기~3기, 2025·2026)은 모두 이 형식이라 발행이 막히는 문서는 없다.
 */

/** 숫자 바로 뒤에 '기'. '03기'도 '3기'와 다른 탭이 되므로 앞자리 0 은 받지 않는다. */
export function checkGeneration(value: string | undefined): true | string {
  if (value === undefined || /^[1-9]\d*기$/.test(value)) return true;
  const number = Number(value.match(/\d+/)?.[0] ?? 0);
  return `띄어쓰기 없이 숫자 뒤에 '기'를 붙여 주세요. 예: ${number > 0 ? number : 3}기`;
}

/** 네 자리 연도만 받는다. */
export function checkYear(value: string | undefined): true | string {
  if (value === undefined || /^\d{4}$/.test(value)) return true;
  return `네 자리 숫자로만 입력해 주세요. 예: ${value.match(/\d{4}/)?.[0] ?? '2025'}`;
}
