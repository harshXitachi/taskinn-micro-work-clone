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

    // Fetch commission rate from adminSettings
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
    const commissionAmount = withdrawalAmount * commissionRate;
    const netAmount = withdrawalAmount - commissionAmount;

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
        description: `Withdrawal to ${paymentMethod}: ${paymentAddress}. Commission: ${commissionAmount.toFixed(2)} ${currencyType}. Net amount: ${netAmount.toFixed(2)} ${currencyType}${notes ? `. ${notes}` : ''}`,
        createdAt: timestamp,
      })
      .returning();

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
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();
      adminWallet = newAdminWallet;
    } else {
      // Update existing admin wallet with commission
      const updatedAdminWallet = await db
        .update(adminWallets)
        .set({
          balance: adminWallet[0].balance + commissionAmount,
          totalEarned: adminWallet[0].totalEarned + commissionAmount,
          updatedAt: timestamp,
        })
        .where(eq(adminWallets.id, adminWallet[0].id))
        .returning();
      adminWallet = updatedAdminWallet;
    }

    return NextResponse.json(
      {
        success: true,
        withdrawal: {
          transactionId: withdrawalTransaction[0].id,
          amount: withdrawalAmount,
          commission: Number(commissionAmount.toFixed(2)),
          netAmount: Number(netAmount.toFixed(2)),
          commissionRate: commissionRate,
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