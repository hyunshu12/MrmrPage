export default function Footer() {
  return (
    <footer className="bg-muruk-green-deepest/80 py-10">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <nav aria-label="소셜 미디어 링크" className="mb-4 flex justify-center gap-4">
          {/* 소셜 링크는 실제 채널 URL로 업데이트 필요 */}
          {/*
          <a
            href="https://www.instagram.com/mrmr_dimigo"
            rel="noopener noreferrer"
            target="_blank"
            className="text-muruk-green-lightest/70 hover:text-muruk-green-lightest transition-colors"
          >
            Instagram
          </a>
          <a
            href="https://github.com/mrmr-dimigo"
            rel="noopener noreferrer"
            target="_blank"
            className="text-muruk-green-lightest/70 hover:text-muruk-green-lightest transition-colors"
          >
            GitHub
          </a>
          */}
        </nav>
        <p className="text-sm text-muruk-green-lightest/70">
          &copy; {new Date().getFullYear()} 무럭무럭 | MRMR. All rights reserved.
        </p>
        <p className="mt-2 text-xs text-muruk-green-lightest/40">PLANT US RAISE EARTH</p>
      </div>
    </footer>
  );
}
