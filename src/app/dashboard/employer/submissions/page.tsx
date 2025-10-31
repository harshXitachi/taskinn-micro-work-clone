"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Star
} from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: number;
  taskId: number;
  taskTitle: string;
  workerId: number;
  workerName: string;
  submissionText: string;
  attachmentUrl: string | null;
  status: string;
  reward: number;
  submittedAt: string;
}

export default function EmployerSubmissionsPage() {
  const { data: session } = useSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(5);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const userId = session?.user?.id;

        if (!userId) return;

        const res = await fetch(`/api/submissions?employerId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success) {
          setSubmissions(data.data);
        }
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchSubmissions();
    }
  }, [session]);

  const handleReview = async (submissionId: number, status: "approved" | "rejected") => {
    if (!feedback.trim() && status === "rejected") {
      toast.error("Please provide feedback for rejection");
      return;
    }

    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          feedback: feedback || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // If approved, create review
        if (status === "approved") {
          const submission = submissions.find(s => s.id === submissionId);
          if (submission) {
            await fetch("/api/reviews", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                taskId: submission.taskId,
                workerId: submission.workerId,
                rating,
                comment: feedback || "Good work!",
              }),
            });
          }
        }

        toast.success(`Submission ${status} successfully!`);
        setSubmissions(submissions.map(s => 
          s.id === submissionId 
            ? { ...s, status }
            : s
        ));
        setReviewingId(null);
        setFeedback("");
        setRating(5);
      } else {
        toast.error(data.message || "Failed to review submission");
      }
    } catch (error) {
      console.error("Error reviewing submission:", error);
      toast.error("Failed to review submission");
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (filterStatus === "all") return true;
    return sub.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === "pending").length,
    approved: submissions.filter(s => s.status === "approved").length,
    rejected: submissions.filter(s => s.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-semibold mb-2">Review Submissions</h1>
        <p className="text-gray-600">Approve or reject worker submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-gray-600 text-sm mb-1">Total Submissions</p>
          <p className="text-3xl font-semibold">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-6">
          <p className="text-gray-600 text-sm mb-1">Pending Review</p>
          <p className="text-3xl font-semibold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-6">
          <p className="text-gray-600 text-sm mb-1">Approved</p>
          <p className="text-3xl font-semibold text-green-700">{stats.approved}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-6">
          <p className="text-gray-600 text-sm mb-1">Rejected</p>
          <p className="text-3xl font-semibold text-red-700">{stats.rejected}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
        >
          <option value="all">All Submissions</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-gray-500">No submissions found</p>
          </div>
        ) : (
          filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        submission.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        submission.status === "approved" ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {submission.status === "pending" && <Clock size={14} className="inline mr-1" />}
                        {submission.status === "approved" && <CheckCircle size={14} className="inline mr-1" />}
                        {submission.status === "rejected" && <XCircle size={14} className="inline mr-1" />}
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{submission.taskTitle}</h3>
                    <p className="text-gray-600">Submitted by: {submission.workerName}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm text-gray-600 mb-1">Reward</p>
                    <p className="text-2xl font-semibold text-green-600">${submission.reward}</p>
                  </div>
                </div>

                {/* Submission Content */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium mb-2">Submission</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{submission.submissionText}</p>
                  {submission.attachmentUrl && (
                    <div className="mt-3">
                      <a
                        href={submission.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Eye size={16} />
                        View Attachment
                      </a>
                    </div>
                  )}
                </div>

                {/* Review Actions */}
                {submission.status === "pending" && (
                  <div className="border-t pt-4">
                    {reviewingId === submission.id ? (
                      <div className="space-y-4">
                        {/* Rating */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Rating</label>
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="transition-colors"
                              >
                                <Star
                                  size={24}
                                  className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Feedback */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Feedback (Required for rejection)
                          </label>
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Provide feedback to the worker..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all resize-none"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview(submission.id, "approved")}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                          >
                            <ThumbsUp size={18} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(submission.id, "rejected")}
                            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                          >
                            <ThumbsDown size={18} />
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setReviewingId(null);
                              setFeedback("");
                              setRating(5);
                            }}
                            className="px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:border-black transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingId(submission.id)}
                        className="w-full px-6 py-3 bg-black text-white rounded-xl font-medium hover:shadow-lg transition-all hover:-translate-y-0.5"
                      >
                        Review Submission
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
