import { Loader2 } from "lucide-react";

const variants = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger:
    "font-display font-600 rounded-xl px-5 py-2.5 text-sm transition-all duration-200 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
  success:
    "font-display font-600 rounded-xl px-5 py-2.5 text-sm transition-all duration-200 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20",
};

const sizes = {
  sm: "!px-3 !py-1.5 !text-xs",
  md: "",
  lg: "!px-7 !py-3.5 !text-base",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  onClick,
  type = "button",
  ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${variants[variant]} ${sizes[size]} ${className} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center`}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
