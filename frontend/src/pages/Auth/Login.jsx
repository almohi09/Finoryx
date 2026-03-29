import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/auth.service";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { setStoredToken } from "../../utils/auth";
import BrandLogo from "../../components/branding/BrandLogo";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await authService.login(form);
      setStoredToken(data.token);
      login(data.user);
      toast.success(`Welcome back, ${data.user.username}!`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 border-r relative overflow-hidden"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #f59e0b 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative z-10">
          <BrandLogo size="md" />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-display font-800 leading-tight mb-4">
              Build habits.<br />
              <span style={{ color: "var(--accent-gold)" }}>Grow wealth.</span>
            </h1>
            <p className="muted-text text-base leading-relaxed max-w-sm">
              Track your income, expenses, and investments while building the financial discipline that creates lasting wealth.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Active Users", value: "12,400+" },
              { label: "Avg. Savings Rate", value: "23%" },
              { label: "Goals Achieved", value: "8,200+" },
              { label: "Habit Completion", value: "78%" },
            ].map((stat) => (
              <div key={stat.label} className="card p-4">
                <div className="text-2xl font-display font-800 gold-text">{stat.value}</div>
                <div className="text-xs muted-text mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs muted-text relative z-10">
          (c) 2026 Fynorix. All rights reserved.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-6 lg:hidden">
              <BrandLogo size="sm" />
            </div>
            <h2 className="text-3xl font-display font-800 mb-1">Welcome back</h2>
            <p className="muted-text text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              icon={Mail}
              error={errors.email}
            />

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`input-field pl-9 pr-10 ${errors.password ? "border-red-500/60" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 muted-text hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm muted-text mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="gold-text hover:underline font-display font-600">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;


