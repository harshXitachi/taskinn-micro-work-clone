"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  CreditCard,
  Wallet
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
  const [paymentMethod, setPaymentMethod] = useState("usd");
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const userId = session?.user?.id;

        if (!userId) return;

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

    if (paymentMethod === "usdt" && !walletAddress.trim()) {
      toast.error("Please enter your USDT TRC-20 wallet address");
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
          currency: paymentMethod,
          walletAddress: paymentMethod === "usdt" ? walletAddress : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Withdrawal request submitted successfully!");
        setWithdrawAmount("");
        setWalletAddress("");
        
        // Refresh data
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to process withdrawal");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-semibold mb-2">Earnings</h1>
        <p className="text-gray-600">Track your income and manage withdrawals</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-green-100 text-sm mb-1">Total Earnings</p>
          <p className="text-3xl font-semibold">${stats.totalEarnings.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Wallet size={24} />
          </div>
          <p className="text-gray-600 text-sm mb-1">Available Balance</p>
          <p className="text-3xl font-semibold">${availableBalance.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center mb-4">
            <Calendar size={24} />
          </div>
          <p className="text-gray-600 text-sm mb-1">This Month</p>
          <p className="text-3xl font-semibold">${stats.thisMonthEarnings.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-gray-600 text-sm mb-1">Withdrawn</p>
          <p className="text-3xl font-semibold">${stats.withdrawnEarnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-semibold mb-6">Request Withdrawal</h2>
        
        <form onSubmit={handleWithdraw} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
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
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Available: ${availableBalance.toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
              >
                <option value="usd">USD (Bank Transfer)</option>
                <option value="usdt">USDT TRC-20</option>
              </select>
            </div>
          </div>

          {paymentMethod === "usdt" && (
            <div>
              <label className="block text-sm font-medium mb-2">USDT TRC-20 Wallet Address</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter your USDT TRC-20 wallet address"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                required={paymentMethod === "usdt"}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={withdrawing || availableBalance <= 0}
            className="w-full px-6 py-4 bg-black text-white rounded-full font-medium hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            <Download size={20} />
            {withdrawing ? "Processing..." : "Request Withdrawal"}
          </button>
        </form>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-semibold mb-6">Payment History</h2>
        
        {payments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No payment history yet</p>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-black transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    payment.type === "earning" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {payment.type === "earning" ? <TrendingUp size={20} /> : <Download size={20} />}
                  </div>
                  <div>
                    <p className="font-medium">
                      {payment.type === "earning" ? "Task Earning" : "Withdrawal"}
                    </p>
                    {payment.taskTitle && (
                      <p className="text-sm text-gray-500">{payment.taskTitle}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-semibold ${
                    payment.type === "earning" ? "text-green-600" : "text-blue-600"
                  }`}>
                    {payment.type === "earning" ? "+" : "-"}${payment.amount.toFixed(2)}
                  </p>
                  <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                    payment.status === "completed" ? "bg-green-100 text-green-700" :
                    payment.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {payment.status}
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
