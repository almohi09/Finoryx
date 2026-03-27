import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, Coins, Phone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/auth.service";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

const GOALS = [
  { value: "save_more", label: "Save more money" },
  { value: "track_expenses", label: "Track my expenses" },
  { value: "build_wealth", label: "Build long-term wealth" },
  { value: "debt_free", label: "Become debt-free" },
  { value: "invest", label: "Start investing" },
];

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    primaryGoal: "save_more",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Min 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await authService.register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        primaryGoal: form.primaryGoal,
      });
      login(data.user);
      toast.success("Account created! Welcome to WealthWise");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-lg animate-fade-up">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-gold)" }}>
            <Coins size={15} color="#0e0d09" strokeWidth={2.5} />
          </div>
          <span className="font-display font-800 text-lg">WealthWise</span>
        </div>

        <h2 className="text-3xl font-display font-800 mb-1">Create your account</h2>
        <p className="muted-text text-sm mb-7">Start your journey to financial freedom</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" placeholder="Mohd Almohi" value={form.name} onChange={set("name")} icon={User} error={errors.name} />
            <Input label="Phone (optional)" placeholder="+91 9XXXXXXXXX" value={form.phone} onChange={set("phone")} icon={Phone} type="tel" />
          </div>

          <Input label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} icon={Mail} error={errors.email} />

          <Select label="Primary Financial Goal" value={form.primaryGoal} onChange={set("primaryGoal")} options={GOALS} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Min 6 chars"
                  value={form.password}
                  onChange={set("password")}
                  className={`input-field pl-9 pr-10 ${errors.password ? "border-red-500/60" : ""}`}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 muted-text hover:text-white transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  className={`input-field pl-9 ${errors.confirmPassword ? "border-red-500/60" : ""}`}
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm muted-text mt-5">
          Already have an account?{" "}
          <Link to="/login" className="gold-text hover:underline font-display font-600">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
