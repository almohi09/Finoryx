const Card = ({ children, className = "", elevated = false, onClick }) => {
  return (
    <div
      className={`${elevated ? "card-elevated" : "card"} ${onClick ? "cursor-pointer hover:border-[var(--border-light)] transition-colors" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const StatCard = ({ label, value, change, icon: Icon, color = "gold", prefix = "₹" }) => {
  const isPositive = change >= 0;
  const colorMap = {
    gold: "text-amber-400 bg-amber-400/10",
    green: "text-green-400 bg-green-400/10",
    blue: "text-blue-400 bg-blue-400/10",
    red: "text-red-400 bg-red-400/10",
    purple: "text-purple-400 bg-purple-400/10",
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <span className="muted-text text-sm">{label}</span>
        {Icon && (
          <span className={`p-2 rounded-xl ${colorMap[color]}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="stat-value">{prefix}{typeof value === "number" ? value.toLocaleString("en-IN") : value}</div>
      {change !== undefined && (
        <div className={`mt-1 text-xs ${isPositive ? "text-green-400" : "text-red-400"}`}>
          {isPositive ? "↑" : "↓"} {Math.abs(change)}% vs last month
        </div>
      )}
    </Card>
  );
};

export default Card;
