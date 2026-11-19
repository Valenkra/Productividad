import { MAX_STAGE, STAGE_NAMES } from "./growth";

const LEAF = "var(--leaf)";
const LEAF_DARK = "var(--leaf-strong)";
const SOIL = "var(--soil)";

/** Hoja: elipse rotada alrededor de (x, y). */
function Leaf({
  x,
  y,
  angle,
  size = 1,
}: {
  x: number;
  y: number;
  angle: number;
  size?: number;
}) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={13 * size}
      ry={6 * size}
      transform={`rotate(${angle} ${x} ${y})`}
      fill={size > 1 ? LEAF_DARK : LEAF}
    />
  );
}

/**
 * Ilustración SVG por etapa (0–5). Pura y accesible (role="img" + etiqueta).
 * `growing` activa un balanceo suave; se desactiva con prefers-reduced-motion (CSS).
 */
export function PlantIllustration({
  stage,
  growing = false,
  size = 200,
}: {
  stage: number;
  growing?: boolean;
  size?: number;
}) {
  const s = Math.max(0, Math.min(MAX_STAGE, Math.floor(stage)));
  const stemTop = [118, 100, 80, 62, 50, 44][s];

  return (
    <svg
      role="img"
      aria-label={`Planta en etapa ${STAGE_NAMES[s]}`}
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className="plant-pop"
    >
      {/* maceta */}
      <path d="M36 118h48l-5 20H41z" fill={SOIL} />
      <ellipse cx="60" cy="118" rx="26" ry="5" fill="#6b4f36" />

      <g
        className={growing ? "plant-sway" : undefined}
        style={{ transformOrigin: "60px 118px" }}
      >
        {s === 0 && <ellipse cx="60" cy="114" rx="5" ry="3.5" fill="#a78a64" />}

        {s >= 1 && (
          <path
            d={`M60 118 L60 ${stemTop}`}
            stroke={LEAF_DARK}
            strokeWidth={s >= 4 ? 5 : 3}
            strokeLinecap="round"
          />
        )}
        {s === 1 && (
          <>
            <Leaf x={52} y={102} angle={-30} />
            <Leaf x={68} y={102} angle={30} />
          </>
        )}
        {s >= 2 && (
          <>
            <Leaf x={50} y={100} angle={-30} />
            <Leaf x={70} y={100} angle={30} />
            <Leaf x={51} y={86} angle={-25} />
            <Leaf x={69} y={86} angle={25} />
          </>
        )}
        {s >= 3 && (
          <>
            <Leaf x={48} y={72} angle={-30} size={1.2} />
            <Leaf x={72} y={72} angle={30} size={1.2} />
            <Leaf x={60} y={58} angle={-90} size={1.1} />
          </>
        )}
        {s >= 4 && (
          <>
            <Leaf x={44} y={90} angle={-15} size={1.3} />
            <Leaf x={76} y={90} angle={15} size={1.3} />
            <Leaf x={46} y={60} angle={-40} size={1.2} />
            <Leaf x={74} y={60} angle={40} size={1.2} />
          </>
        )}
        {s === 4 && <circle cx="60" cy="46" r="4" fill="#d9a441" />}
        {s === 5 && (
          <g>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse
                key={a}
                cx="60"
                cy="34"
                rx="5"
                ry="9"
                transform={`rotate(${a} 60 44)`}
                fill="#e58fa8"
              />
            ))}
            <circle cx="60" cy="44" r="5" fill="#d9a441" />
          </g>
        )}
      </g>
    </svg>
  );
}
