"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  DollarSign,
  TrendingUp,
  Briefcase,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  Activity,
  Wallet,
  BarChart3,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminSession, setAdminSession] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    totalEmployers: 0,
    totalTasks: 0,
    activeTasks: 0,
    totalEarnings: 0,
    adminWallet: 0,
    commissionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check admin session
    const session = localStorage.getItem("admin_session");
    if (!session) {
      router.push("/admin");
      return;
    }

    setAdminSession(JSON.parse(session));
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      // Fetch users stats
      const usersRes = await fetch("/api/users");
      const users = await usersRes.json();
      
      const workers = users.filter((u: any) => u.role === "worker").length;
      const employers = users.filter((u: any) => u.role === "employer").length;

      // Fetch tasks stats
      const tasksRes = await fetch("/api/tasks");
      const tasks = await tasksRes.json();
      const activeTasks = tasks.filter((t: any) => t.status === "open").length;

      // Fetch admin settings
      const settingsRes = await fetch("/api/admin/settings");
      const settings = await settingsRes.json();
      const adminSettings = settings[0];

      // Fetch payments to calculate total earnings
      const paymentsRes = await fetch("/api/payments");
      const payments = await paymentsRes.json();
      const totalEarnings = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      setStats({
        totalUsers: users.length,
        totalWorkers: workers,
        totalEmployers: employers,
        totalTasks: tasks.length,
        activeTasks,
        totalEarnings,
        adminWallet: adminSettings?.totalEarnings || 0,
        commissionRate: (adminSettings?.commissionRate || 0) * 100,
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    router.push("/admin");
  };

  if (!adminSession || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const menuItems = [
    {
      icon: BarChart3,
      label: "Analytics",
      href: "/admin/dashboard/analytics",
      color: "text-blue-400",
    },
    {
      icon: UserCog,
      label: "User Management",
      href: "/admin/dashboard/users",
      color: "text-purple-400",
    },
    {
      icon: Wallet,
      label: "Admin Wallet",
      href: "/admin/dashboard/wallet",
      color: "text-green-400",
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/admin/dashboard/settings",
      color: "text-orange-400",
    },
  ];

  const statCards = [
    { icon: Users, label: "Total Users", value: stats.totalUsers, color: "bg-blue-500" },
    { icon: Briefcase, label: "Active Tasks", value: stats.activeTasks, color: "bg-purple-500" },
    { icon: DollarSign, label: "Total Earnings", value: `$${stats.totalEarnings.toFixed(2)}`, color: "bg-green-500" },
    { icon: Wallet, label: "Admin Wallet", value: `$${stats.adminWallet.toFixed(2)}`, color: "bg-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/5289a710-af5c-41be-91c0-17bd70aee84a/generated_images/modern-minimalist-logo-for-taskinn-a-pro-7f90acf1-20251031063352.jpg"
                alt="TaskInn Logo"
                width={120}
                height={40}
                className="h-8 w-auto brightness-0 invert"
              />
              <div className="bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1 flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-400" />
                <span className="text-red-400 text-sm font-medium">Admin</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm">
                Welcome, <span className="font-medium text-white">{adminSession.username}</span>
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage your TaskInn platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div className="text-2xl font-semibold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-medium text-white">User Breakdown</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Workers</span>
                <span className="text-white font-medium">{stats.totalWorkers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Employers</span>
                <span className="text-white font-medium">{stats.totalEmployers}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-medium text-white">Task Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Tasks</span>
                <span className="text-white font-medium">{stats.totalTasks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Active Tasks</span>
                <span className="text-white font-medium">{stats.activeTasks}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-medium text-white">Commission</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Rate</span>
                <span className="text-white font-medium">{stats.commissionRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Collected</span>
                <span className="text-white font-medium">${stats.adminWallet.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-medium text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-white font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
