import { useEffect, useRef } from "react";

const MagnetLines = ({
  rows = 9,
  columns = 9,
  containerSize = "80vmin",
  lineColor = "#efefef",
  lineWidth = "1vmin",
  lineHeight = "6vmin",
  baseAngle = -10,
  className = "",
  style = {},
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.querySelectorAll("span"));
    let centers = [];
    let frame = null;
    let pendingPointer = null;

    const measure = () => {
      centers = items.map((item) => {
        const rect = item.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      });
    };

    const applyRotation = (pointer) => {
      items.forEach((item, i) => {
        const { x: centerX, y: centerY } = centers[i];
        const b = pointer.x - centerX;
        const a = pointer.y - centerY;
        const c = Math.sqrt(a * a + b * b) || 1;
        const r =
          ((Math.acos(b / c) * 180) / Math.PI) * (pointer.y > centerY ? 1 : -1);

        item.style.setProperty("--rotate", `${r}deg`);
      });
    };

    const onPointerMove = (event) => {
      pendingPointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        applyRotation(pendingPointer);
      });
    };

    measure();
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", measure);

    if (centers.length) {
      applyRotation(centers[Math.floor(centers.length / 2)]);
    }

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", measure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rows, columns]);

  const total = rows * columns;
  const spans = Array.from({ length: total }, (_, i) => (
    <span
      key={i}
      style={{
        "--rotate": `${baseAngle}deg`,
        backgroundColor: lineColor,
        width: lineWidth,
        height: lineHeight,
      }}
    />
  ));

  return (
    <div
      ref={containerRef}
      className={`magnetLines-container ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: containerSize,
        height: containerSize,
        ...style,
      }}
    >
      {spans}
    </div>
  );
};

export default MagnetLines;
