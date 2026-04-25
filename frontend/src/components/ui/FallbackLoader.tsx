export function GlobalFallbackLoader() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-calm-sage/30"></div>
          <div className="absolute inset-2 animate-spin rounded-full border-t-2 border-b-2 border-calm-sage"></div>
        </div>
        <p className="animate-pulse text-sm font-medium text-calm-sage/80 tracking-wide">Loading experience...</p>
      </div>
    </div>
  );
}
