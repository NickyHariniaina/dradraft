import Board from "@/components/Board";
import Toolbar from "@/components/Toolbar";
import TopBar, { SceneName, ThemeToggle } from "@/components/TopBar";
import StylePanel from "@/components/StylePanel";
import ZoomBar from "@/components/ZoomBar";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <Board />
      </div>

      {/* top bar: actions left, scene name center */}
      <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between">
        <div className="pointer-events-auto">
          <TopBar />
        </div>
        <div className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2">
          <SceneName />
        </div>
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* left rail toolbar */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2">
        <Toolbar />
      </div>

      {/* style panel */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <StylePanel />
      </div>

      {/* bottom bar */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
        <ZoomBar />
        <div className="float-bar hidden rounded-2xl px-3 py-2 text-[12px] text-black/60 dark:text-white/60 md:block">
          drag to draw · space to pan · scroll to move · ctrl+scroll to zoom
        </div>
      </div>
    </main>
  );
}
