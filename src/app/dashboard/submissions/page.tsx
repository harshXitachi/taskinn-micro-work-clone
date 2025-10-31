"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Filter,
  Calendar,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface Submission {
  id: number;
  taskId: number;
  taskTitle: string;
  submissionText: string;
  attachmentUrl: string | null;
  status: string;
  reward: number;
  submittedAt: string;
  reviewedAt: string | null;
  feedback: string | null;
}

export default function SubmissionsPage() {
  const { data: session } = useSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const userId = session?.user?.id;

        if (!userId) return;

        const res = await fetch(`/api/submissions?workerId=${userId}`, {
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

  const filteredSubmissions = submissions.filter((sub) => {
    if (filterStatus === "all") return true;
    return sub.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
      approved: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
      rejected: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
    };

    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon size={16} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

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
        <h1 className="text-4xl font-semibold mb-2">My Submissions</h1>
        <p className="text-gray-600">Track your submitted tasks and their status</p>
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
        <div className="flex items-center gap-3">
          <Filter size={20} className="text-gray-400" />
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
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-gray-500">No submissions found</p>
            <Link
              href="/dashboard/tasks"
              className="inline-block mt-4 px-6 py-3 bg-black text-white rounded-full font-medium hover:shadow-lg transition-all"
            >
              Browse Available Tasks
            </Link>
          </div>
        ) : (
          filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(submission.status)}
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar size={14} />
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{submission.taskTitle}</h3>
                  <p className="text-gray-600 mb-3 line-clamp-2">{submission.submissionText}</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm text-gray-600 mb-1">Reward</p>
                  <p className="text-2xl font-semibold text-green-600">${submission.reward}</p>
                </div>
              </div>

              {submission.feedback && (
                <div className={`p-4 rounded-xl mb-4 ${
                  submission.status === "approved" ? "bg-green-50" : "bg-red-50"
                }`}>
                  <p className="text-sm font-medium mb-1">Feedback</p>
                  <p className="text-sm text-gray-700">{submission.feedback}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                {submission.attachmentUrl && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Eye size={16} />
                    <a
                      href={submission.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      View Attachment
                    </a>
                  </div>
                )}

                {/* View Details Button */}
                <Link
                  href={`/dashboard/tasks/${submission.taskId}`}
                  className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  View Details
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}