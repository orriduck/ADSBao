import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";

const GRID_ROWS = 4;
const GRID_COLUMNS = 7;

// Decorative photography is intentionally separate from flight-data imagery.
// Shuffle only once per mount so a route change feels fresh without reflowing
// while a user is trying to read the page's actual content.
const PHOTO_POOL = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=960&q=80",
  "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=960&q=80",
  "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=960&q=80",
  "https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=960&q=80",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=960&q=80",
  "https://images.unsplash.com/photo-1583416750470-965b2707b355?auto=format&fit=crop&w=960&q=80",
  "https://images.unsplash.com/photo-1540339832862-474599807836?auto=format&fit=crop&w=960&q=80",
  "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=960&q=80",
  "https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=960&q=80",
  "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=960&q=80",
] as const;

function shuffle<T>(items: readonly T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[nextIndex]] = [
      result[nextIndex],
      result[index],
    ];
  }

  return result;
}

export default function PageMotionGrid() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const photos = useMemo(() => shuffle(PHOTO_POOL), []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const rows = rowRefs.current.filter(
      (row): row is HTMLDivElement => row !== null,
    );
    const moveRows = rows.map((row, index) => ({
      baseX: index % 2 === 0 ? -36 : 36,
      baseY: (index - 1.5) * -6,
      x: gsap.quickTo(row, "x", { duration: 0.78, ease: "power3.out" }),
      y: gsap.quickTo(row, "y", { duration: 0.78, ease: "power3.out" }),
    }));

    const move = (clientX: number, clientY: number) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const relativeX = (clientX - bounds.left) / bounds.width - 0.5;
      const relativeY = (clientY - bounds.top) / bounds.height - 0.5;

      moveRows.forEach((row, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        row.x(row.baseX + relativeX * 88 * direction);
        row.y(row.baseY + relativeY * 30);
      });
    };

    moveRows.forEach((row) => {
      row.x(row.baseX);
      row.y(row.baseY);
    });

    const handlePointerMove = (event: PointerEvent) => {
      move(event.clientX, event.clientY);
    };
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      rows.forEach((row) => gsap.killTweensOf(row));
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="page-motion-grid"
    >
      <div className="page-motion-grid__canvas">
        {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
          <div
            key={rowIndex}
            ref={(node) => {
              rowRefs.current[rowIndex] = node;
            }}
            className="page-motion-grid__row"
          >
            {Array.from({ length: GRID_COLUMNS }, (_, columnIndex) => {
              const photoIndex = (rowIndex * GRID_COLUMNS + columnIndex) % photos.length;
              const photo = photos[photoIndex];

              return (
                <div
                  key={`${photo}-${rowIndex}-${columnIndex}`}
                  className="page-motion-grid__tile"
                >
                  <img
                    alt=""
                    className="page-motion-grid__image media-photo-color"
                    decoding="async"
                    draggable={false}
                    loading={rowIndex > 1 ? "lazy" : "eager"}
                    src={photo}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
