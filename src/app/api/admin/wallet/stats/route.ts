import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adminWallets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        },
        { status: 401 }
      );
    }

    // Authorization check - must be admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Not authorized. Admin access required.',
          code: 'FORBIDDEN'
        },
        { status: 403 }
      );
    }

    // Get admin wallets for both currencies
    const adminWalletsData = await db.select().from(adminWallets);

    // Find USD and USDT wallets
    const usdWallet = adminWalletsData.find(w => w.currencyType === 'USD');
    const usdtWallet = adminWalletsData.find(w => w.currencyType === 'USDT_TRC20');

    // Return admin wallet statistics
    return NextResponse.json({
      success: true,
      stats: {
        usd: {
          balance: usdWallet?.balance || 0,
          totalEarned: usdWallet?.totalEarned || 0,
          totalWithdrawn: usdWallet?.totalWithdrawn || 0,
          pendingCommissions: 0, // Can be calculated from pending withdrawals if needed
          createdAt: usdWallet?.createdAt || null,
          updatedAt: usdWallet?.updatedAt || null,
        },
        usdt: {
          balance: usdtWallet?.balance || 0,
          totalEarned: usdtWallet?.totalEarned || 0,
          totalWithdrawn: usdtWallet?.totalWithdrawn || 0,
          pendingCommissions: 0,
          createdAt: usdtWallet?.createdAt || null,
          updatedAt: usdtWallet?.updatedAt || null,
        },
        combined: {
          totalCommissionsUSD: usdWallet?.totalEarned || 0,
          totalCommissionsUSDT: usdtWallet?.totalEarned || 0,
          currentBalanceUSD: usdWallet?.balance || 0,
          currentBalanceUSDT: usdtWallet?.balance || 0,
          totalWithdrawalsUSD: usdWallet?.totalWithdrawn || 0,
          totalWithdrawalsUSDT: usdtWallet?.totalWithdrawn || 0,
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/admin/wallet/stats error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}