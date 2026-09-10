import Board from "@/components/Board";
import Toolbar from "@/components/Toolbar";
import TopBar from "@/components/TopBar";
import StylePanel from "@/components/StylePanel";
import ZoomBar from "@/components/ZoomBar";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <Board />
      </div>

      {/* top bar */}
      <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between">
        <div className="pointer-events-auto">
          <TopBar />
        </div>
      </div>

      {/* floating toolbar */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2">
        <Toolbar />
      </div>

      {/* style panel */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <StylePanel />
      </div>

      {/* bottom bar */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
        <ZoomBar />
        <div className="float-bar hidden rounded-2xl px-3 py-2 text-[12px] text-black/60 md:block">
          drag to draw · space to pan · scroll to move · ctrl+scroll to zoom
        </div>
      </div>

      {/* brand corner */}
      <div className="absolute bottom-4 left-4 hidden font-serif text-[13px] italic text-black/50 lg:block">
        dradraft — think in sketches
      </div>
    </main>
  );
}
