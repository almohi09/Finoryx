const BrandLogo = ({
  size = "md",
  showName = true,
  className = "",
}) => {
  const sizing = {
    sm: { box: "w-8 h-8 rounded-xl", name: "text-lg" },
    md: { box: "w-9 h-9 rounded-xl", name: "text-xl" },
    lg: { box: "w-11 h-11 rounded-2xl", name: "text-2xl" },
  };

  const currentSize = sizing[size] || sizing.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/fynvester.png"
        alt="Fynvester logo"
        className={`${currentSize.box} object-cover border`}
        style={{ borderColor: "rgba(255,255,255,0.2)" }}
      />
      {showName ? (
        <span className={`font-display font-800 tracking-tight ${currentSize.name}`}>Fynvester</span>
      ) : null}
    </div>
  );
};

export default BrandLogo;
