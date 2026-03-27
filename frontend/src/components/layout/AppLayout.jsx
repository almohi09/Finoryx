import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { feedbackService } from "../../services/feedback.service";
import toast from "react-hot-toast";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    category: "experience",
    rating: "5",
    message: "",
  });

  const submitFeedback = async () => {
    if (!feedbackForm.message.trim()) {
      return toast.error("Please enter your feedback");
    }

    setFeedbackSaving(true);
    try {
      await feedbackService.submitFeedback(feedbackForm);
      toast.success("Feedback sent to admin");
      setFeedbackForm({ category: "experience", rating: "5", message: "" });
      setFeedbackOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send feedback");
    } finally {
      setFeedbackSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 lg:ml-60">
        <Navbar onMenuToggle={() => setSidebarOpen((v) => !v)} onFeedbackClick={() => setFeedbackOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <Modal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} title="Send Feedback" size="sm">
        <div className="space-y-4">
          <Select
            label="Category"
            value={feedbackForm.category}
            onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
            options={[
              { value: "experience", label: "Product Experience" },
              { value: "bug", label: "Bug Report" },
              { value: "feature", label: "Feature Request" },
              { value: "other", label: "Other" },
            ]}
          />
          <Select
            label="Rating"
            value={feedbackForm.rating}
            onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: e.target.value })}
            options={[
              { value: "5", label: "5 - Excellent" },
              { value: "4", label: "4 - Good" },
              { value: "3", label: "3 - Okay" },
              { value: "2", label: "2 - Poor" },
              { value: "1", label: "1 - Very Poor" },
            ]}
          />
          <div>
            <label className="label">Message</label>
            <textarea
              value={feedbackForm.message}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
              rows={5}
              placeholder="Tell us what is working, what is broken, or what should improve."
              className="input-field resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={feedbackSaving} onClick={submitFeedback}>Send</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AppLayout;
