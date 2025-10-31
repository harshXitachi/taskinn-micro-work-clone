"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  Wallet,
  AlertCircle,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface Payment {
  id: number;
  amount: number;
  currency: string;
  type: string;
  status: string;
  createdAt: string;
  taskTitle?: string;
}

interface Stats {
  totalEarnings: number;
  pendingEarnings: number;
  withdrawnEarnings: number;
  thisMonthEarnings: number;
}

export default function EarningsPage() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEarnings: 0,
    pendingEarnings: 0,
    withdrawnEarnings: 0,
    thisMonthEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [walletAddress, setWalletAddress] = useState("");
  const [commissionRate, setCommissionRate] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const userId = session?.user?.id;

        if (!userId) return;

        // Fetch commission rate
        const settingsRes = await fetch("/api/admin/settings");
        const settingsData = await settingsRes.json();
        if (settingsData && settingsData.length > 0) {
          setCommissionRate((settingsData[0].commissionRate || 0.05) * 100);
        }

        // Fetch payments
        const paymentsRes = await fetch(`/api/payments?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const paymentsData = await paymentsRes.json();

        if (paymentsData.success) {
          setPayments(paymentsData.data);

          // Calculate stats
          const total = paymentsData.data
            .filter((p: Payment) => p.type === "earning")
            .reduce((sum: number, p: Payment) => sum + p.amount, 0);
          
          const pending = paymentsData.data
            .filter((p: Payment) => p.type === "earning" && p.status === "pending")
            .reduce((sum: number, p: Payment) => sum + p.amount, 0);
          
          const withdrawn = paymentsData.data
            .filter((p: Payment) => p.type === "withdrawal" && p.status === "completed")
            .reduce((sum: number, p: Payment) => sum + p.amount, 0);

          const thisMonth = paymentsData.data
            .filter((p: Payment) => {
              const date = new Date(p.createdAt);
              const now = new Date();
              return date.getMonth() === now.getMonth() && 
                     date.getFullYear() === now.getFullYear() &&
                     p.type === "earning";
            })
            .reduce((sum: number, p: Payment) => sum + p.amount, 0);

          setStats({
            totalEarnings: total,
            pendingEarnings: pending,
            withdrawnEarnings: withdrawn,
            thisMonthEarnings: thisMonth,
          });
        }
      } catch (error) {
        console.error("Error fetching earnings:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const availableBalance = stats.totalEarnings - stats.withdrawnEarnings - stats.pendingEarnings;
    if (amount > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!walletAddress.trim()) {
      toast.error("Please enter your payment details");
      return;
    }

    setWithdrawing(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          currency: "USD",
          paymentMethod,
          paymentAddress: walletAddress,
        }),
      });

      const data = await res.json();

      if (data.id) {
        const commission = amount * (commissionRate / 100);
        const netAmount = amount - commission;
        
        toast.success(
          `Withdrawal request submitted! You will receive $${netAmount.toFixed(2)} after ${commissionRate}% commission ($${commission.toFixed(2)})`,
          { duration: 5000 }
        );
        setWithdrawAmount("");
        setWalletAddress("");
        
        // Refresh data
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to process withdrawal");
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      toast.error("Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const availableBalance = stats.totalEarnings - stats.withdrawnEarnings - stats.pendingEarnings;
  const withdrawalAmount = parseFloat(withdrawAmount) || 0;
  const commissionAmount = withdrawalAmount * (commissionRate / 100);
  const netAmount = withdrawalAmount - commissionAmount;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold mb-2">Earnings</h1>
          <p className="text-gray-600">Track your income and manage withdrawals</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-emerald-100 text-sm mb-1 font-medium">Total Earnings</p>
          <p className="text-4xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Wallet size={24} />
          </div>
          <p className="text-gray-600 text-sm mb-1 font-medium">Available Balance</p>
          <p className="text-4xl font-bold text-gray-900">${availableBalance.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <Calendar size={24} />
          </div>
          <p className="text-gray-600 text-sm mb-1 font-medium">This Month</p>
          <p className="text-4xl font-bold text-gray-900">${stats.thisMonthEarnings.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-gray-600 text-sm mb-1 font-medium">Total Withdrawn</p>
          <p className="text-4xl font-bold text-gray-900">${stats.withdrawnEarnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Download className="text-gray-900" size={24} />
          <h2 className="text-2xl font-semibold">Request Withdrawal</h2>
        </div>
        
        <form onSubmit={handleWithdraw} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Available: <span className="font-semibold text-emerald-600">${availableBalance.toFixed(2)}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              >
                <option value="bank">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="crypto_wallet">Crypto Wallet (USDT)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              {paymentMethod === "bank" ? "Bank Account Details" : paymentMethod === "paypal" ? "PayPal Email" : "Wallet Address (TRC-20)"}
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={
                paymentMethod === "bank" 
                  ? "Enter bank account number" 
                  : paymentMethod === "paypal"
                  ? "your@email.com"
                  : "TRC-20 wallet address"
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              required
            />
          </div>

          {/* Commission Breakdown */}
          {withdrawalAmount > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Withdrawal Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-800">Withdrawal Amount:</span>
                      <span className="font-semibold text-blue-900">${withdrawalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Commission ({commissionRate}%):</span>
                      <span className="font-semibold text-red-600">-${commissionAmount.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-blue-200 my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-900 font-medium">You will receive:</span>
                      <span className="font-bold text-emerald-600 text-lg">${netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={withdrawing || availableBalance <= 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {withdrawing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download size={20} />
                Request Withdrawal
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
        <h2 className="text-2xl font-semibold mb-6">Payment History</h2>
        
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">No payment history yet</p>
            <p className="text-gray-400 text-sm mt-1">Complete tasks to start earning!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    payment.type === "earning" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {payment.type === "earning" ? <TrendingUp size={20} /> : <Download size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.type === "earning" ? "Task Earning" : "Withdrawal"}
                    </p>
                    {payment.taskTitle && (
                      <p className="text-sm text-gray-500">{payment.taskTitle}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(payment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${
                    payment.type === "earning" ? "text-emerald-600" : "text-blue-600"
                  }`}>
                    {payment.type === "earning" ? "+" : "-"}${payment.amount.toFixed(2)}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    payment.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    payment.status === "pending" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {payment.status === "completed" && <CheckCircle size={12} />}
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}