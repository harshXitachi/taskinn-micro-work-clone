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
  CheckCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: number;
  type: string;
  amount: number;
  currencyType: string;
  status: string;
  description: string;
  createdAt: string;
}

interface Stats {
  totalEarnings: number;
  availableBalance: number;
  thisMonthEarnings: number;
  totalWithdrawn: number;
}

export default function EarningsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEarnings: 0,
    availableBalance: 0,
    thisMonthEarnings: 0,
    totalWithdrawn: 0,
  });
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [walletAddress, setWalletAddress] = useState("");
  const [commissionRate] = useState(0); // No commission on withdrawals

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const userId = session?.user?.id;

        if (!userId) return;

        // Fetch earnings data
        const earningsRes = await fetch(`/api/workers/earnings?userId=${userId}&currencyType=USD`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const earningsData = await earningsRes.json();

        if (earningsData.success) {
          setStats(earningsData.data.summary);
          setTransactions(earningsData.data.transactions);
        }
      } catch (error) {
        console.error("Error fetching earnings:", error);
        toast.error("Failed to fetch earnings data");
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

    if (amount < 5) {
      toast.error("Minimum withdrawal amount is $5");
      return;
    }

    if (amount > stats.availableBalance) {
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
      const res = await fetch("/api/wallets/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          currencyType: "USD",
          paymentMethod,
          paymentAddress: walletAddress,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          `Withdrawal successful! $${amount.toFixed(2)} will be sent to your ${paymentMethod}.`,
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

  const withdrawalAmount = parseFloat(withdrawAmount) || 0;

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
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-emerald-100 text-sm mb-1 font-medium">Total Earnings</p>
          <p className="text-4xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 hover:-translate-y-1">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Wallet size={24} />
          </div>
          <p className="text-gray-600 text-sm mb-1 font-medium">Available Balance</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">${stats.availableBalance.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-amber-200 hover:-translate-y-1">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <Calendar size={24} />
          </div>
          <p className="text-gray-600 text-sm mb-1 font-medium">This Month</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">${stats.thisMonthEarnings.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-200 hover:-translate-y-1">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-gray-600 text-sm mb-1 font-medium">Total Withdrawn</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">${stats.totalWithdrawn.toFixed(2)}</p>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center">
            <Download className="text-emerald-600" size={24} />
          </div>
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
                  min="5"
                  max={stats.availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Available: <span className="font-semibold text-emerald-600">${stats.availableBalance.toFixed(2)}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              required
            />
          </div>

          {/* Withdrawal Preview */}
          {withdrawalAmount >= 5 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-3">Withdrawal Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-blue-200">
                      <span className="text-blue-800">You will receive:</span>
                      <span className="font-bold text-emerald-600 text-xl">${withdrawalAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-blue-700 text-xs mt-2">✓ No commission fees • Full amount transferred</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={withdrawing || stats.availableBalance < 5}
            className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
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
      <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-gray-100">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <Clock size={24} className="text-gray-700" />
          Payment History
        </h2>
        
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium">No payment history yet</p>
            <p className="text-gray-400 text-sm mt-1">Complete tasks to start earning!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-5 border-2 border-gray-100 rounded-xl hover:border-emerald-300 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    transaction.type === "task_payment" ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600" : "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600"
                  }`}>
                    {transaction.type === "task_payment" ? <TrendingUp size={20} /> : <Download size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {transaction.type === "task_payment" ? "Task Payment" : "Withdrawal"}
                    </p>
                    {transaction.description && (
                      <p className="text-sm text-gray-600 max-w-md line-clamp-1">{transaction.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${
                    transaction.amount > 0 ? "text-emerald-600" : "text-blue-600"
                  }`}>
                    {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold mt-1 ${
                    transaction.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    transaction.status === "pending" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {transaction.status === "completed" && <CheckCircle size={12} />}
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
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