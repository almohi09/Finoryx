const BrandLogo = ({
  size = "md",
  showName = true,
  className = "",
}) => {
  const sizing = {
    sm: { box: "w-8 h-8 rounded-xl", icon: "text-sm", name: "text-lg" },
    md: { box: "w-9 h-9 rounded-xl", icon: "text-base", name: "text-xl" },
    lg: { box: "w-11 h-11 rounded-2xl", icon: "text-lg", name: "text-2xl" },
  };

  const currentSize = sizing[size] || sizing.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${currentSize.box} flex items-center justify-center border`}
        style={{
          background:
            "linear-gradient(145deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))",
          borderColor: "rgba(255,255,255,0.2)",
          color: "#130f07",
        }}
        aria-hidden="true"
      >
        <span className={`font-display font-800 leading-none ${currentSize.icon}`}>F</span>
      </div>
      {showName ? (
        <span className={`font-display font-800 tracking-tight ${currentSize.name}`}>Fynorix</span>
      ) : null}
    </div>
  );
};

export default BrandLogo;
