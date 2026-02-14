export default function Head() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      <link rel="preload" as="image" href="/projectImage.png" fetchPriority="high" />
      <link rel="preload" as="image" href="/archiveImage.png" fetchPriority="high" />
      <link rel="preload" as="image" href="/memberImage.png" fetchPriority="high" />
    </>
  );
}
