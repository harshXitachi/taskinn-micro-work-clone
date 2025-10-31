import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets, walletTransactions, adminWallets, adminSettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { amount, currencyType, transactionHash, notes } = body;

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED'
        },
        { status: 400 }
      );
    }

    // Validation: amount is required and must be positive
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          error: 'Amount is required and must be a positive number',
          code: 'INVALID_AMOUNT'
        },
        { status: 400 }
      );
    }

    // Validation: minimum deposit is $5
    if (amount < 5) {
      return NextResponse.json(
        {
          error: 'Minimum deposit amount is $5',
          code: 'AMOUNT_TOO_LOW'
        },
        { status: 400 }
      );
    }

    // Validation: currencyType is required
    if (!currencyType) {
      return NextResponse.json(
        {
          error: 'Currency type is required',
          code: 'MISSING_CURRENCY_TYPE'
        },
        { status: 400 }
      );
    }

    // Validation: currencyType must be USD or USDT_TRC20
    if (currencyType !== 'USD' && currencyType !== 'USDT_TRC20') {
      return NextResponse.json(
        {
          error: 'Currency type must be "USD" or "USDT_TRC20"',
          code: 'INVALID_CURRENCY_TYPE'
        },
        { status: 400 }
      );
    }

    // Get commission rate from admin settings
    const settingsResult = await db.select().from(adminSettings).limit(1);
    
    if (settingsResult.length === 0) {
      return NextResponse.json(
        {
          error: 'Admin settings not found',
          code: 'ADMIN_SETTINGS_NOT_FOUND'
        },
        { status: 500 }
      );
    }

    const commissionRate = settingsResult[0].commissionRate;

    // Calculate commission and net amount
    const commissionAmount = amount * commissionRate;
    const netAmount = amount - commissionAmount;

    // Get or create user wallet for the currency type
    let userWallet = await db
      .select()
      .from(wallets)
      .where(
        and(
          eq(wallets.userId, user.id),
          eq(wallets.currencyType, currencyType)
        )
      )
      .limit(1);

    const now = new Date().toISOString();

    if (userWallet.length === 0) {
      // Create new wallet if it doesn't exist
      const newWallet = await db
        .insert(wallets)
        .values({
          userId: user.id,
          currencyType: currencyType,
          balance: 0,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      userWallet = newWallet;
    }

    const wallet = userWallet[0];

    // Calculate new balance with netAmount (not full amount)
    const newBalance = wallet.balance + netAmount;

    // Update wallet balance
    const updatedWallet = await db
      .update(wallets)
      .set({
        balance: newBalance,
        updatedAt: now
      })
      .where(eq(wallets.id, wallet.id))
      .returning();

    if (updatedWallet.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update wallet balance',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    // Create wallet transaction record for user (netAmount)
    const referenceId = `deposit_${Date.now()}`;
    const description = notes
      ? `Deposit to wallet - ${notes} (Commission: ${commissionAmount.toFixed(2)} ${currencyType})`
      : `Deposit to wallet (Commission: ${commissionAmount.toFixed(2)} ${currencyType})`;

    const transaction = await db
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        transactionType: 'deposit',
        amount: netAmount,
        currencyType: currencyType,
        status: 'completed',
        referenceId: referenceId,
        description: description,
        transactionHash: transactionHash || null,
        createdAt: now
      })
      .returning();

    if (transaction.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to create transaction record',
          code: 'TRANSACTION_FAILED'
        },
        { status: 500 }
      );
    }

    // Get or create admin wallet for this currency
    let adminWallet = await db
      .select()
      .from(adminWallets)
      .where(eq(adminWallets.currencyType, currencyType))
      .limit(1);

    if (adminWallet.length === 0) {
      // Create admin wallet if doesn't exist
      const newAdminWallet = await db
        .insert(adminWallets)
        .values({
          currencyType: currencyType,
          balance: commissionAmount,
          totalEarned: commissionAmount,
          totalWithdrawn: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      adminWallet = newAdminWallet;
    } else {
      // Update existing admin wallet
      const updatedAdminWallet = await db
        .update(adminWallets)
        .set({
          balance: adminWallet[0].balance + commissionAmount,
          totalEarned: adminWallet[0].totalEarned + commissionAmount,
          updatedAt: now,
        })
        .where(eq(adminWallets.id, adminWallet[0].id))
        .returning();
      adminWallet = updatedAdminWallet;
    }

    // Return success response with breakdown
    return NextResponse.json(
      {
        success: true,
        deposit: {
          transactionId: transaction[0].id,
          depositedAmount: amount,
          commissionRate: commissionRate,
          commissionAmount: Number(commissionAmount.toFixed(2)),
          netAmount: Number(netAmount.toFixed(2)),
          currencyType: currencyType,
          newBalance: updatedWallet[0].balance,
          createdAt: transaction[0].createdAt,
          transactionHash: transaction[0].transactionHash || undefined
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/wallets/deposit error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}