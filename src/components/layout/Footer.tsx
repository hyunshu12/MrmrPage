export default function Footer() {
  return (
    <footer className="bg-muruk-green-deepest/80 py-10">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="text-sm text-muruk-green-lightest/70">
          &copy; {new Date().getFullYear()} 무럭무럭 MurukMuruk. All rights reserved.
        </p>
        <p className="mt-2 text-xs text-muruk-green-lightest/40">
          PLANT US RAISE EARTH
        </p>
      </div>
    </footer>
  );
}
