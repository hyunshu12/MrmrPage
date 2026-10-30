import CurrentYear from './CurrentYear.client';

export default function Footer() {
  return (
    // relative z-10: 홈의 fixed WebGPU 배경 캔버스(z-0)가 푸터를 덮지 않게 한다.
    // 배경을 불투명하게 둬야 뒤에 무엇이 있든 글자 대비가 AA(4.5:1) 이상으로 고정된다.
    <footer className="relative z-10 bg-muruk-green-deepest py-10">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="text-sm text-muruk-green-lightest/90">
          &copy; <CurrentYear serverYear={new Date().getFullYear()} /> 무럭무럭 | MRMR. All rights reserved.
        </p>
        <p className="mt-2 text-xs text-muruk-green-lightest/70">PLANT US RAISE EARTH</p>
      </div>
    </footer>
  );
}
