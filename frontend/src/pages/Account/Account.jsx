import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LockKeyhole, Mail, Save, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/auth.service";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

const INITIAL_PROFILE_FORM = {
  name: "",
  email: "",
};

const INITIAL_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const Account = () => {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState(INITIAL_PROFILE_FORM);
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: user?.name || user?.username || "",
      email: user?.email || "",
    });
  }, [user]);

  const setProfileField = (field) => (event) => {
    setProfileForm((current) => ({ ...current, [field]: event.target.value }));
    setProfileErrors((current) => ({ ...current, [field]: "" }));
  };

  const setPasswordField = (field) => (event) => {
    setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
    setPasswordErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateProfile = () => {
    const errors = {};

    if (!profileForm.name.trim()) errors.name = "Name is required";
    if (!profileForm.email.trim()) errors.email = "Email is required";

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors = {};

    if (!passwordForm.currentPassword) errors.currentPassword = "Current password is required";
    if (!passwordForm.newPassword) errors.newPassword = "New password is required";
    else if (passwordForm.newPassword.length < 6) errors.newPassword = "Minimum 6 characters";
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      errors.newPassword = "New password must be different";
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!validateProfile()) return;

    setProfileSaving(true);
    try {
      const { data } = await authService.updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });

      updateUser(data.user);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!validatePassword()) return;

    setPasswordSaving(true);
    try {
      const { data } = await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm(INITIAL_PASSWORD_FORM);
      toast.success(data.message || "Password changed successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="page-title">Account</h1>
          <p className="muted-text text-sm mt-1">Manage your profile details and sign-in credentials</p>
        </div>
        {user?.role === "admin" && (
          <span className="badge-gold inline-flex items-center gap-2">
            <ShieldCheck size={12} />
            Admin
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <Card className="animate-fade-up animate-delay-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">Profile</h3>
              <p className="muted-text text-sm mt-1">Update the identity information shown across the app</p>
            </div>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(245, 158, 11, 0.12)", color: "var(--accent-gold)" }}
            >
              <User size={18} />
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <Input
              label="Full Name"
              placeholder="Enter your name"
              value={profileForm.name}
              onChange={setProfileField("name")}
              icon={User}
              error={profileErrors.name}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={profileForm.email}
              onChange={setProfileField("email")}
              icon={Mail}
              error={profileErrors.email}
            />
            <div className="pt-2 flex justify-end">
              <Button type="submit" loading={profileSaving} className="min-w-40">
                <Save size={14} />
                Save Profile
              </Button>
            </div>
          </form>
        </Card>

        <Card className="animate-fade-up animate-delay-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">Change Password</h3>
              <p className="muted-text text-sm mt-1">Use your current password to set a new one</p>
            </div>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(96, 165, 250, 0.12)", color: "var(--accent-blue)" }}
            >
              <LockKeyhole size={18} />
            </div>
          </div>

          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              value={passwordForm.currentPassword}
              onChange={setPasswordField("currentPassword")}
              icon={LockKeyhole}
              error={passwordErrors.currentPassword}
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={passwordForm.newPassword}
              onChange={setPasswordField("newPassword")}
              icon={LockKeyhole}
              error={passwordErrors.newPassword}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              value={passwordForm.confirmPassword}
              onChange={setPasswordField("confirmPassword")}
              icon={LockKeyhole}
              error={passwordErrors.confirmPassword}
            />
            <div className="rounded-xl border px-4 py-3 text-xs muted-text" style={{ borderColor: "var(--border)" }}>
              Passwords must be at least 6 characters long.
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" loading={passwordSaving} className="min-w-44">
                <LockKeyhole size={14} />
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Account;


