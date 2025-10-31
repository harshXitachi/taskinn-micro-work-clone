import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets, walletTransactions } from '@/db/schema';
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

    // Calculate new balance (NO commission deduction)
    const newBalance = wallet.balance + amount;

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

    // Create wallet transaction record
    const referenceId = `deposit_${Date.now()}`;
    const description = notes
      ? `Deposit to wallet - ${notes}`
      : 'Deposit to wallet';

    const transaction = await db
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        transactionType: 'deposit',
        amount: amount,
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

    // Return success response
    return NextResponse.json(
      {
        success: true,
        deposit: {
          transactionId: transaction[0].id,
          amount: transaction[0].amount,
          currencyType: transaction[0].currencyType,
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