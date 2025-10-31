"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isPending) {
        console.error("Session fetch timed out after 10 seconds");
        setIsTimedOut(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isPending]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
    }
  }, [session, isPending, router]);

  // Handle timeout case
  if (isTimedOut && isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3f0]">
        <div className="text-center max-w-md">
          <p className="text-xl font-semibold mb-4">Loading session timed out</p>
          <p className="text-gray-600 mb-6">Please try refreshing the page or logging in again.</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-3 bg-black text-white rounded-full font-medium hover:shadow-lg transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3f0]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const userRole = (session.user as any).role || "worker";
  console.log("Dashboard layout - User role:", userRole, "User:", session.user);

  return (
    <div className="min-h-screen bg-[#f5f3f0]">
      <Sidebar userRole={userRole} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}