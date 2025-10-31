"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useParams } from "next/navigation";
import { 
  DollarSign, 
  Clock, 
  Calendar,
  ArrowLeft,
  AlertCircle,
  Upload
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Task {
  id: number;
  title: string;
  description: string;
  instructions: string;
  reward: number;
  timeEstimate: string;
  categoryId: number;
  category: string;
  status: string;
  createdAt: string;
  employerId: number;
  employerName: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const res = await fetch(`/api/tasks/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success) {
          setTask(data.data);
        } else {
          toast.error("Task not found");
          router.push("/dashboard/tasks");
        }
      } catch (error) {
        console.error("Error fetching task:", error);
        toast.error("Failed to load task");
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!submissionText.trim()) {
      toast.error("Please provide your submission");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch(`/api/tasks/${params.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submissionText,
          attachmentUrl: attachmentUrl || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Task submitted successfully!");
        router.push("/dashboard/submissions");
      } else {
        toast.error(data.message || "Failed to submit task");
      }
    } catch (error) {
      console.error("Error submitting task:", error);
      toast.error("Failed to submit task");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/tasks"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Tasks
      </Link>

      {/* Task Header */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-medium">
            {task.category}
          </span>
          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
            task.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100"
          }`}>
            {task.status}
          </span>
        </div>

        <h1 className="text-3xl font-semibold mb-4">{task.title}</h1>

        <div className="flex items-center gap-6 text-gray-600 mb-6">
          <div className="flex items-center gap-2">
            <DollarSign size={20} />
            <span className="font-semibold text-green-600">${task.reward}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={20} />
            <span>{task.timeEstimate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={20} />
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-2">Posted by</h2>
          <p className="text-gray-600">{task.employerName}</p>
        </div>
      </div>

      {/* Task Description */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Description</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
      </div>

      {/* Task Instructions */}
      {task.instructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h2 className="text-xl font-semibold mb-2">Instructions</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{task.instructions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Submission Form */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-semibold mb-6">Submit Your Work</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Submission *
            </label>
            <textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              placeholder="Describe your work or paste your completed task here..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Attachment URL (Optional)
            </label>
            <div className="relative">
              <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://example.com/your-file.pdf"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Provide a link to your work (Google Drive, Dropbox, etc.)
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-4 bg-black text-white rounded-full font-medium hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {submitting ? "Submitting..." : "Submit Task"}
          </button>
        </form>
      </div>
    </div>
  );
}
