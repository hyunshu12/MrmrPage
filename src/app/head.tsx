export default function Head() {
  return (
    <>
      <link rel="preload" as="image" href="/projectImage.png" fetchPriority="high" />
      <link rel="preload" as="image" href="/archiveImage.png" fetchPriority="high" />
      <link rel="preload" as="image" href="/memberImage.png" fetchPriority="high" />
    </>
  );
}
