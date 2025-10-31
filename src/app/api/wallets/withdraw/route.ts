import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets, walletTransactions, adminWallets, adminSettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, currencyType, paymentMethod, paymentAddress, notes } = body;

    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    if (!currencyType) {
      return NextResponse.json(
        { error: 'Currency type is required', code: 'MISSING_CURRENCY_TYPE' },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required', code: 'MISSING_PAYMENT_METHOD' },
        { status: 400 }
      );
    }

    if (!paymentAddress) {
      return NextResponse.json(
        { error: 'Payment address is required', code: 'MISSING_PAYMENT_ADDRESS' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate minimum withdrawal
    if (withdrawalAmount < 5) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is $5', code: 'AMOUNT_TOO_LOW' },
        { status: 400 }
      );
    }

    // Validate currency type
    if (currencyType !== 'USD' && currencyType !== 'USDT_TRC20') {
      return NextResponse.json(
        { error: 'Invalid currency type', code: 'INVALID_CURRENCY_TYPE' },
        { status: 400 }
      );
    }

    // Get user's wallet
    const userWallet = await db
      .select()
      .from(wallets)
      .where(
        and(
          eq(wallets.userId, user.id),
          eq(wallets.currencyType, currencyType)
        )
      )
      .limit(1);

    if (userWallet.length === 0) {
      return NextResponse.json(
        { error: 'Wallet not found', code: 'WALLET_NOT_FOUND' },
        { status: 404 }
      );
    }

    const wallet = userWallet[0];

    // Check if user has sufficient balance
    if (wallet.balance < withdrawalAmount) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          code: 'INSUFFICIENT_BALANCE',
          details: {
            available: wallet.balance,
            requested: withdrawalAmount,
          },
        },
        { status: 409 }
      );
    }

    const timestamp = new Date().toISOString();

    // Deduct withdrawal amount from user wallet
    const updatedWallet = await db
      .update(wallets)
      .set({
        balance: wallet.balance - withdrawalAmount,
        updatedAt: timestamp,
      })
      .where(eq(wallets.id, wallet.id))
      .returning();

    // Create withdrawal transaction for user (negative amount to indicate debit)
    const withdrawalTransaction = await db
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        transactionType: 'withdrawal',
        amount: -withdrawalAmount,
        currencyType: currencyType,
        status: 'completed',
        referenceId: `withdrawal_${Date.now()}`,
        description: `Withdrawal to ${paymentMethod}: ${paymentAddress}${notes ? `. ${notes}` : ''}`,
        createdAt: timestamp,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        withdrawal: {
          transactionId: withdrawalTransaction[0].id,
          amount: withdrawalAmount,
          currencyType: currencyType,
          paymentMethod: paymentMethod,
          paymentAddress: paymentAddress,
          previousBalance: wallet.balance,
          newBalance: updatedWallet[0].balance,
          status: 'completed',
          createdAt: timestamp,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/wallets/withdraw error:', error);
    return NextResponse.json(
      {
        error:
          'Internal server error: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}