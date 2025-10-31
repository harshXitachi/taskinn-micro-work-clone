"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  DollarSign, 
  Star,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SidebarProps {
  userRole: "worker" | "employer" | "admin";
}

const workerLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Available Tasks", icon: Briefcase },
  { href: "/dashboard/submissions", label: "My Submissions", icon: CheckSquare },
  { href: "/dashboard/earnings", label: "Earnings", icon: DollarSign },
  { href: "/dashboard/profile", label: "Profile", icon: Settings },
];

const employerLinks = [
  { href: "/dashboard/employer", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/employer/tasks", label: "My Tasks", icon: Briefcase },
  { href: "/dashboard/employer/submissions", label: "Submissions", icon: CheckSquare },
  { href: "/dashboard/employer/payments", label: "Payments", icon: DollarSign },
  { href: "/dashboard/employer/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/employer/profile", label: "Profile", icon: Settings },
];

const adminLinks = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/tasks", label: "All Tasks", icon: Briefcase },
  { href: "/dashboard/admin/disputes", label: "Disputes", icon: FileText },
  { href: "/dashboard/admin/payments", label: "Payments", icon: DollarSign },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const links = userRole === "admin" ? adminLinks : userRole === "employer" ? employerLinks : workerLinks;

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error("Failed to sign out");
    } else {
      localStorage.removeItem("bearer_token");
      toast.success("Signed out successfully");
      router.push("/");
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg" />
              <span className="text-xl font-semibold">TaskInn</span>
            </Link>
            <p className="text-sm text-gray-500 mt-1 capitalize">{userRole} Dashboard</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sign Out Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
        />
      )}
    </>
  );
}
