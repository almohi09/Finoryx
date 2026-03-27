const Input = ({
  label,
  error,
  icon: Icon,
  className = "",
  containerClass = "",
  ...props
}) => {
  return (
    <div className={`${containerClass}`}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <Icon size={15} />
          </span>
        )}
        <input
          className={`input-field ${Icon ? "pl-9" : ""} ${error ? "border-red-500/60" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Input;
