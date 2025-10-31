"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, TrendingUp, DollarSign, Percent, Save, Download, AlertCircle, Check, X } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Withdrawal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [paymentAddress, setPaymentAddress] = useState("");
  const [withdrawNotes, setWithdrawNotes] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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

      setWallet({
        totalEarnings: adminSettings?.totalEarnings || 0,
        commissionRate: (adminSettings?.commissionRate || 0.05) * 100,
        adminSettingsId: adminSettings?.id || 1,
      });
      setNewCommissionRate((adminSettings?.commissionRate || 0.05) * 100);
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

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount < 5) {
      toast.error("Minimum withdrawal amount is $5");
      return;
    }

    if (amount > wallet.totalEarnings) {
      toast.error("Insufficient balance");
      return;
    }

    if (!paymentAddress.trim()) {
      toast.error("Please provide payment address/account details");
      return;
    }

    setIsWithdrawing(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/admin/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          paymentMethod,
          paymentAddress: paymentAddress.trim(),
          notes: withdrawNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      toast.success(`Successfully withdrew $${amount.toFixed(2)}`);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setPaymentAddress("");
      setWithdrawNotes("");
      loadWalletData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Withdrawal failed");
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/5289a710-af5c-41be-91c0-17bd70aee84a/generated_images/modern-minimalist-logo-for-taskinn-a-pro-7f90acf1-20251031063352.jpg"
                alt="TaskInn Logo"
                width={120}
                height={40}
                className="h-8 w-auto brightness-0 invert"
              />
              <h1 className="text-xl font-semibold text-white">Admin Wallet</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Wallet Balance Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Commission Balance</h2>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Download className="h-5 w-5" />
              Withdraw
            </button>
          </div>
          <div className="text-6xl font-bold text-white mb-4">
            ${wallet.totalEarnings.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 text-emerald-300">
            <TrendingUp className="h-5 w-5" />
            <span>Total commission earned from platform</span>
          </div>
        </div>

        {/* Commission Rate Management */}
        <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Percent className="h-6 w-6 text-orange-400" />
            Commission Rate Management
          </h3>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Current Commission Rate</label>
                <div className="text-5xl font-bold text-white">{wallet.commissionRate}%</div>
                <p className="text-sm text-slate-400 mt-3">
                  Deducted from user withdrawals only (not from task payments)
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Update Commission Rate</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newCommissionRate}
                      onChange={(e) => setNewCommissionRate(parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                      placeholder="5.0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                  </div>
                  <Button
                    onClick={handleUpdateCommissionRate}
                    disabled={isSaving || newCommissionRate === wallet.commissionRate}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl px-6 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Update"}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Rate applies to all future user withdrawals
                </p>
              </div>
            </div>
          </div>

          {/* Commission Example */}
          <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
            <div className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              How Commission Works
            </div>
            <div className="text-slate-300 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Worker completes task and receives <strong>$100</strong> in wallet</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Worker requests withdrawal of <strong>$100</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>System deducts <strong>{newCommissionRate}%</strong> commission = <strong>${(100 * newCommissionRate / 100).toFixed(2)}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Worker receives <strong className="text-emerald-400">${(100 - (100 * newCommissionRate / 100)).toFixed(2)}</strong> to their bank/wallet</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-400" />
                <span>Admin earns <strong className="text-orange-400">${(100 * newCommissionRate / 100).toFixed(2)}</strong> commission</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="backdrop-blur-xl bg-slate-800 border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Withdraw Commission</h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Available Balance
                </label>
                <div className="text-3xl font-bold text-emerald-400">
                  ${wallet.totalEarnings.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Withdrawal Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    min="5"
                    max={wallet.totalEarnings}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Minimum withdrawal: $5.00</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto_wallet">Crypto Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Account Details / Address
                </label>
                <input
                  type="text"
                  value={paymentAddress}
                  onChange={(e) => setPaymentAddress(e.target.value)}
                  placeholder="Bank account, email, or wallet address"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none resize-none"
                />
              </div>

              <Button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isWithdrawing ? "Processing..." : "Confirm Withdrawal"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}