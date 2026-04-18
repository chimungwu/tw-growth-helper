/**
 * GrowthCurveChart
 * 純 SVG 百分位成長曲線圖（P3 / P15 / P25 / P50 / P75 / P85 / P97）
 * 不依賴任何圖表庫，零 bundle 負擔。
 */

type GrowthData = {
  Age: number[];
  ' 3rd': number[];
  '15th': number[];
  '25th': number[];
  '50th': number[];
  '75th': number[];
  '85th': number[];
  '97th': number[];
};

type PercentileKey = keyof Omit<GrowthData, 'Age'>;

interface Props {
  data: GrowthData;
  age: number;              // 孩子的實足/矯正年齡
  value: number;            // 孩子的身高或體重
  gender: 'boy' | 'girl';
  metric: 'height' | 'weight';
  size?: 'small' | 'large'; // small = 卡片內嵌；large = 全螢幕
  onZoom?: () => void;
}

const PERCENTILE_KEYS: PercentileKey[] = [' 3rd', '15th', '50th', '85th', '97th'];
const PERCENTILE_LABELS = ['P3', 'P15', 'P50', 'P85', 'P97'];
const LINE_COLORS: Record<PercentileKey, string> = {
  ' 3rd': '#ef4444',  // 紅（極端低）
  '15th': '#f59e0b',  // 琥珀（偏低）
  '25th': '#84cc16',  // 黃綠（不顯示，保留型別完整）
  '50th': '#22c55e',  // 綠（中位數，粗線）
  '75th': '#84cc16',  // 黃綠（不顯示，保留型別完整）
  '85th': '#f59e0b',  // 琥珀（偏高）
  '97th': '#ef4444',  // 紅（極端高）
};

export function GrowthCurveChart({ data, age, value, gender, metric, size = 'small', onZoom }: Props) {
  const isLarge = size === 'large';

  // --- 1. 可視年齡範圍 ---
  // 小圖只顯示孩子年齡 ±3 歲區間，避免曲線太擠；大圖顯示完整 0–18.5 歲
  const minAge = isLarge ? 0 : Math.max(0, age - 3);
  const maxAge = isLarge ? 18.5 : Math.min(18.5, age + 3);

  // --- 2. 過濾出可視範圍內的資料點（含邊界內插）---
  const visible: { a: number; i: number }[] = [];
  for (let i = 0; i < data.Age.length; i++) {
    if (data.Age[i] >= minAge && data.Age[i] <= maxAge) {
      visible.push({ a: data.Age[i], i });
    }
  }

  if (visible.length < 2) {
    return (
      <div className="text-center text-slate-500 text-sm py-8">
        資料不足以繪製曲線
      </div>
    );
  }

  // --- 3. Y 軸範圍 ---
  let minY = Infinity;
  let maxY = -Infinity;
  for (const { i } of visible) {
    if (data[' 3rd'][i] < minY) minY = data[' 3rd'][i];
    if (data['97th'][i] > maxY) maxY = data['97th'][i];
  }
  // 讓孩子的點一定在可視區內
  if (value < minY) minY = value;
  if (value > maxY) maxY = value;
  // Padding
  const yPad = (maxY - minY) * 0.05;
  minY -= yPad;
  maxY += yPad;

  // --- 4. 尺寸 ---
  const width = isLarge ? 1000 : 360;
  const height = isLarge ? 600 : 260;
  const margin = {
    top: isLarge ? 24 : 14,
    right: isLarge ? 56 : 40,
    bottom: isLarge ? 48 : 32,
    left: isLarge ? 56 : 36,
  };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // --- 5. 比例尺 ---
  const xScale = (a: number) =>
    margin.left + ((a - minAge) / (maxAge - minAge)) * innerW;
  const yScale = (v: number) =>
    margin.top + (1 - (v - minY) / (maxY - minY)) * innerH;

  const buildPath = (key: PercentileKey) =>
    visible
      .map(
        ({ a, i }, idx) =>
          `${idx === 0 ? 'M' : 'L'}${xScale(a).toFixed(1)},${yScale(data[key][i]).toFixed(1)}`
      )
      .join(' ');

  // P3→P97 填色帶（超淡）
  const bandPath = [
    visible.map(({ a, i }, idx) =>
      `${idx === 0 ? 'M' : 'L'}${xScale(a).toFixed(1)},${yScale(data[' 3rd'][i]).toFixed(1)}`
    ).join(' '),
    visible.slice().reverse().map(({ a, i }) =>
      `L${xScale(a).toFixed(1)},${yScale(data['97th'][i]).toFixed(1)}`
    ).join(' '),
    'Z',
  ].join(' ');

  // --- 6. 軸刻度 ---
  const xStep = isLarge ? 2 : 1;
  const xTicks: number[] = [];
  for (let t = Math.ceil(minAge / xStep) * xStep; t <= maxAge + 0.01; t += xStep) {
    xTicks.push(parseFloat(t.toFixed(1)));
  }

  const yStep =
    metric === 'height' ? (isLarge ? 20 : 10) : (isLarge ? 10 : 5);
  const yTicks: number[] = [];
  for (let t = Math.ceil(minY / yStep) * yStep; t <= maxY; t += yStep) {
    yTicks.push(t);
  }

  const genderColor = gender === 'boy' ? '#2563eb' : '#db2777';
  const dotColor = metric === 'height' ? genderColor : '#ea580c';

  const valueLabel = `${value} ${metric === 'height' ? 'cm' : 'kg'}`;
  const ageLabel = `${age.toFixed(1)} 歲`;

  // 是否在可視範圍內
  const dotInRange = age >= minAge && age <= maxAge && value >= minY && value <= maxY;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className={`font-black text-slate-800 ${isLarge ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base'}`}>
          {metric === 'height' ? '身高' : '體重'}成長曲線
          <span className="ml-2 text-xs font-bold text-slate-400">
            ({gender === 'boy' ? '男孩' : '女孩'})
          </span>
        </h3>
        {onZoom && !isLarge && (
          <button
            type="button"
            onClick={onZoom}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
            title="在新分頁放大顯示"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            放大
          </button>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${metric === 'height' ? '身高' : '體重'}成長曲線圖`}
      >
        {/* 背景 */}
        <rect x={margin.left} y={margin.top} width={innerW} height={innerH} fill="#fafafa" rx="4" />

        {/* Y 格線 */}
        {yTicks.map((t) => (
          <line
            key={`ygrid-${t}`}
            x1={margin.left}
            y1={yScale(t)}
            x2={width - margin.right}
            y2={yScale(t)}
            stroke="#e2e8f0"
            strokeDasharray="3 3"
            strokeWidth="0.5"
          />
        ))}

        {/* P3–P97 淡色帶 */}
        <path d={bandPath} fill={genderColor} fillOpacity="0.04" />

        {/* 百分位曲線 */}
        {PERCENTILE_KEYS.map((key) => (
          <path
            key={key}
            d={buildPath(key)}
            fill="none"
            stroke={LINE_COLORS[key]}
            strokeWidth={key === '50th' ? (isLarge ? 2.5 : 1.8) : isLarge ? 1.5 : 1.1}
            strokeOpacity={key === '50th' ? 0.85 : 0.55}
          />
        ))}

        {/* X 軸 */}
        <line
          x1={margin.left}
          y1={height - margin.bottom}
          x2={width - margin.right}
          y2={height - margin.bottom}
          stroke="#94a3b8"
          strokeWidth="1"
        />
        {xTicks.map((t) => (
          <g key={`xtick-${t}`}>
            <line
              x1={xScale(t)}
              y1={height - margin.bottom}
              x2={xScale(t)}
              y2={height - margin.bottom + 4}
              stroke="#94a3b8"
              strokeWidth="1"
            />
            <text
              x={xScale(t)}
              y={height - margin.bottom + (isLarge ? 18 : 14)}
              textAnchor="middle"
              fontSize={isLarge ? 12 : 10}
              fill="#475569"
              fontWeight="700"
            >
              {t}
            </text>
          </g>
        ))}
        <text
          x={width / 2}
          y={height - (isLarge ? 6 : 4)}
          textAnchor="middle"
          fontSize={isLarge ? 13 : 10}
          fill="#334155"
          fontWeight="800"
        >
          年齡（歲）
        </text>

        {/* Y 軸 */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={height - margin.bottom}
          stroke="#94a3b8"
          strokeWidth="1"
        />
        {yTicks.map((t) => (
          <g key={`ytick-${t}`}>
            <line
              x1={margin.left - 4}
              y1={yScale(t)}
              x2={margin.left}
              y2={yScale(t)}
              stroke="#94a3b8"
              strokeWidth="1"
            />
            <text
              x={margin.left - 6}
              y={yScale(t) + 3}
              textAnchor="end"
              fontSize={isLarge ? 12 : 10}
              fill="#475569"
              fontWeight="700"
            >
              {t}
            </text>
          </g>
        ))}
        <text
          x={isLarge ? 18 : 10}
          y={margin.top + innerH / 2}
          textAnchor="middle"
          fontSize={isLarge ? 13 : 10}
          fill="#334155"
          fontWeight="800"
          transform={`rotate(-90, ${isLarge ? 18 : 10}, ${margin.top + innerH / 2})`}
        >
          {metric === 'height' ? '身高（cm）' : '體重（kg）'}
        </text>

        {/* 右邊的百分位標籤 */}
        {PERCENTILE_KEYS.map((key, idx) => {
          const last = visible[visible.length - 1];
          if (!last) return null;
          const y = yScale(data[key][last.i]);
          return (
            <text
              key={`label-${key}`}
              x={width - margin.right + 4}
              y={y + 3}
              fontSize={isLarge ? 11 : 9}
              fill={LINE_COLORS[key]}
              fontWeight="800"
            >
              {PERCENTILE_LABELS[idx]}
            </text>
          );
        })}

        {/* 孩子的點 */}
        {dotInRange && (
          <g>
            {/* 垂直 + 水平虛線輔助 */}
            <line
              x1={xScale(age)}
              y1={yScale(value)}
              x2={xScale(age)}
              y2={height - margin.bottom}
              stroke={dotColor}
              strokeDasharray="3 3"
              strokeWidth="0.8"
              opacity="0.6"
            />
            <line
              x1={margin.left}
              y1={yScale(value)}
              x2={xScale(age)}
              y2={yScale(value)}
              stroke={dotColor}
              strokeDasharray="3 3"
              strokeWidth="0.8"
              opacity="0.6"
            />
            {/* 光圈 + 點 */}
            <circle cx={xScale(age)} cy={yScale(value)} r={isLarge ? 10 : 7} fill={dotColor} fillOpacity="0.2" />
            <circle
              cx={xScale(age)}
              cy={yScale(value)}
              r={isLarge ? 6 : 4.5}
              fill={dotColor}
              stroke="white"
              strokeWidth={isLarge ? 2.5 : 2}
            />
            {/* 標註 */}
            <text
              x={xScale(age)}
              y={yScale(value) - (isLarge ? 16 : 12)}
              textAnchor="middle"
              fontSize={isLarge ? 15 : 11}
              fill={dotColor}
              fontWeight="900"
            >
              {valueLabel}
            </text>
            {isLarge && (
              <text
                x={xScale(age)}
                y={yScale(value) - 32}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
                fontWeight="700"
              >
                {ageLabel}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
