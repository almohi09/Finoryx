const ProgressBar = ({ value = 0, max = 100, color = "gold", showLabel = true, height = "h-2" }) => {
  const safeMax = Number(max) > 0 ? Number(max) : 0;
  const safeValue = Number(value) || 0;
  const pct = safeMax > 0 ? Math.min(Math.round((safeValue / safeMax) * 100), 100) : 0;

  const colorMap = {
    gold: "from-amber-500 to-yellow-400",
    green: "from-green-500 to-emerald-400",
    blue: "from-blue-500 to-cyan-400",
    red: "from-red-500 to-rose-400",
    purple: "from-purple-500 to-violet-400",
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs muted-text">{pct}%</span>
          <span className="text-xs muted-text">{safeValue.toLocaleString("en-IN")} / {safeMax.toLocaleString("en-IN")}</span>
        </div>
      )}
      <div className={`progress-bar-bg ${height}`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorMap[color]} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
