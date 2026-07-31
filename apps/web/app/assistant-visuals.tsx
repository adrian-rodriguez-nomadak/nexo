type MetricItem = { label: string; value: string; detail?: string };
type ChartPoint = { label: string; value: number };

export type AssistantVisualBlock =
  | { type: "metric_row"; items: MetricItem[] }
  | { type: "data_table"; title?: string; columns: string[]; rows: string[][] }
  | { type: "bar_chart"; title?: string; points: ChartPoint[]; unit?: string }
  | { type: "line_chart"; title?: string; points: ChartPoint[]; unit?: string }
  | { type: "progress"; label: string; value: number; displayValue?: string }
  | { type: "alert"; tone: "info" | "warning" | "success"; title?: string; message: string };

function Chart({ block }: { block: Extract<AssistantVisualBlock, { type: "bar_chart" | "line_chart" }> }) {
  const width = 640;
  const height = 190;
  const padding = 24;
  const maximum = Math.max(1, ...block.points.map((point) => Math.abs(point.value)));
  const slot = (width - padding * 2) / block.points.length;
  const coordinates = block.points.map((point, index) => ({
    x: padding + slot * index + slot / 2,
    y: height - padding - (Math.abs(point.value) / maximum) * (height - padding * 2),
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="assistant-visual assistant-chart">
      {block.title ? <h4>{block.title}</h4> : null}
      <svg
        aria-label={`${block.title ?? "Gráfica"}. ${block.points.map((point) => `${point.label}: ${point.value}${block.unit ? ` ${block.unit}` : ""}`).join(", ")}`}
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <line className="assistant-chart-axis" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        {block.type === "bar_chart"
          ? block.points.map((point, index) => {
              const coordinate = coordinates[index];
              const barHeight = height - padding - coordinate.y;
              return <rect className="assistant-chart-mark" height={barHeight} key={`${point.label}-${index}`} rx="5" width={Math.max(10, slot * 0.54)} x={coordinate.x - Math.max(10, slot * 0.54) / 2} y={coordinate.y} />;
            })
          : (
            <>
              <polyline className="assistant-chart-line" points={line} />
              {coordinates.map((point, index) => <circle className="assistant-chart-dot" cx={point.x} cy={point.y} key={index} r="4" />)}
            </>
          )}
      </svg>
      <div className="assistant-chart-labels">
        {block.points.map((point, index) => (
          <span key={`${point.label}-${index}`}><b>{point.value}{block.unit ? ` ${block.unit}` : ""}</b><small>{point.label}</small></span>
        ))}
      </div>
    </section>
  );
}

export function AssistantVisuals({ blocks }: { blocks?: AssistantVisualBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="assistant-visuals">
      {blocks.map((block, index) => {
        if (block.type === "metric_row") {
          return (
            <section className="assistant-visual assistant-metrics" key={index}>
              {block.items.map((item, itemIndex) => (
                <div key={`${item.label}-${itemIndex}`}><small>{item.label}</small><strong>{item.value}</strong>{item.detail ? <span>{item.detail}</span> : null}</div>
              ))}
            </section>
          );
        }
        if (block.type === "data_table") {
          return (
            <section className="assistant-visual assistant-data-table" key={index}>
              {block.title ? <h4>{block.title}</h4> : null}
              <div><table><thead><tr>{block.columns.map((column, columnIndex) => <th key={`${column}-${columnIndex}`}>{column}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{block.columns.map((_, cellIndex) => <td key={cellIndex}>{row[cellIndex] ?? ""}</td>)}</tr>)}</tbody></table></div>
            </section>
          );
        }
        if (block.type === "bar_chart" || block.type === "line_chart") {
          return <Chart block={block} key={index} />;
        }
        if (block.type === "progress") {
          const value = Math.max(0, Math.min(1, block.value));
          return (
            <section className="assistant-visual assistant-progress" key={index}>
              <div><strong>{block.label}</strong><span>{block.displayValue ?? `${Math.round(value * 100)}%`}</span></div>
              <progress aria-label={block.label} max="1" value={value} />
            </section>
          );
        }
        return (
          <aside className={`assistant-visual assistant-alert assistant-alert-${block.tone}`} key={index} role={block.tone === "warning" ? "alert" : "note"}>
            {block.title ? <strong>{block.title}</strong> : null}<p>{block.message}</p>
          </aside>
        );
      })}
    </div>
  );
}
