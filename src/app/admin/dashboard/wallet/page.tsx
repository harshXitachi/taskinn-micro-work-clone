"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, TrendingUp, DollarSign, Percent, Save } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminWalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState({
    totalEarnings: 0,
    commissionRate: 5,
    adminSettingsId: 1,
  });
  const [newCommissionRate, setNewCommissionRate] = useState(5);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (!session) {
      router.push("/admin");
      return;
    }

    loadWalletData();
  }, [router]);

  const loadWalletData = async () => {
    try {
      // Fetch admin settings
      const settingsRes = await fetch("/api/admin/settings");
      const settings = await settingsRes.json();
      const adminSettings = settings[0];

      // Fetch all payments
      const paymentsRes = await fetch("/api/payments");
      const paymentsData = await paymentsRes.json();

      // Filter payments with commission
      const commissionsPayments = paymentsData.filter((p: any) => p.commissionAmount && p.commissionAmount > 0);

      setWallet({
        totalEarnings: adminSettings?.totalEarnings || 0,
        commissionRate: (adminSettings?.commissionRate || 0.05) * 100,
        adminSettingsId: adminSettings?.id || 1,
      });
      setNewCommissionRate((adminSettings?.commissionRate || 0.05) * 100);
      setPayments(commissionsPayments);
    } catch (error) {
      console.error("Failed to load wallet data:", error);
      toast.error("Failed to load wallet data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCommissionRate = async () => {
    if (newCommissionRate < 0 || newCommissionRate > 100) {
      toast.error("Commission rate must be between 0 and 100");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/settings?id=${wallet.adminSettingsId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commissionRate: newCommissionRate / 100,
        }),
      });

      if (!response.ok) throw new Error("Failed to update commission rate");

      toast.success("Commission rate updated successfully");
      loadWalletData();
    } catch (error) {
      toast.error("Failed to update commission rate");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/5289a710-af5c-41be-91c0-17bd70aee84a/generated_images/modern-minimalist-logo-for-taskinn-a-pro-7f90acf1-20251031063352.jpg"
                alt="TaskInn Logo"
                width={120}
                height={40}
                className="h-8 w-auto brightness-0 invert"
              />
              <h1 className="text-xl font-medium text-white">Admin Wallet</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Wallet Balance */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-8 mb-8 text-white">
          <div className="flex items-center gap-3 mb-6">
            <Wallet className="h-8 w-8" />
            <h2 className="text-2xl font-medium">Admin Wallet Balance</h2>
          </div>
          <div className="text-6xl font-semibold mb-4">
            ${wallet.totalEarnings.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 text-green-100">
            <TrendingUp className="h-5 w-5" />
            <span>Total commission earned</span>
          </div>
        </div>

        {/* Commission Rate Manager */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <Percent className="h-5 w-5 text-orange-400" />
            Commission Rate Management
          </h3>

          <div className="bg-gray-700/50 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Current Commission Rate</label>
                <div className="text-4xl font-semibold text-white">{wallet.commissionRate}%</div>
                <p className="text-sm text-gray-400 mt-2">
                  This percentage is automatically deducted from worker payments
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Update Commission Rate</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newCommissionRate}
                      onChange={(e) => setNewCommissionRate(parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all outline-none"
                      placeholder="5.0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                  <Button
                    onClick={handleUpdateCommissionRate}
                    disabled={isSaving || newCommissionRate === wallet.commissionRate}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-xl px-6"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Update"}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Rate will apply to all future transactions
                </p>
              </div>
            </div>
          </div>

          {/* Commission Example */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="text-blue-400 font-medium mb-2">Example Calculation</div>
            <div className="text-gray-300 text-sm space-y-1">
              <div>Worker earns: <span className="text-white font-semibold">$100.00</span></div>
              <div>Commission ({newCommissionRate}%): <span className="text-white font-semibold">${(100 * newCommissionRate / 100).toFixed(2)}</span></div>
              <div className="pt-2 border-t border-blue-500/20">
                Worker receives: <span className="text-green-400 font-semibold">${(100 - (100 * newCommissionRate / 100)).toFixed(2)}</span>
              </div>
              <div>Admin receives: <span className="text-orange-400 font-semibold">${(100 * newCommissionRate / 100).toFixed(2)}</span></div>
            </div>
          </div>
        </div>

        {/* Recent Commission Payments */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            Recent Commission Payments
          </h3>

          {payments.length > 0 ? (
            <div className="space-y-3">
              {payments.slice(0, 10).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl">
                  <div>
                    <div className="text-white font-medium">Payment #{payment.id}</div>
                    <div className="text-sm text-gray-400">
                      {new Date(payment.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">${payment.amount.toFixed(2)}</div>
                    <div className="text-xs text-green-400">
                      Commission: ${(payment.commissionAmount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              No commission payments yet
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
