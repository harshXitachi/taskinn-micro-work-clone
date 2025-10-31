import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets, walletTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currencyType, amount } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!currencyType) {
      return NextResponse.json(
        { error: 'Currency type is required', code: 'MISSING_CURRENCY_TYPE' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate currency type
    if (currencyType !== 'USD' && currencyType !== 'USDT_TRC20') {
      return NextResponse.json(
        { 
          error: 'Currency type must be either "USD" or "USDT_TRC20"', 
          code: 'INVALID_CURRENCY_TYPE' 
        },
        { status: 400 }
      );
    }

    // Validate amount is positive number
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    // Find existing wallet
    const existingWallet = await db
      .select()
      .from(wallets)
      .where(
        and(
          eq(wallets.userId, userId),
          eq(wallets.currencyType, currencyType)
        )
      )
      .limit(1);

    let wallet;
    const currentTimestamp = new Date().toISOString();

    if (existingWallet.length === 0) {
      // Create new wallet if not found
      const newWallet = await db
        .insert(wallets)
        .values({
          userId,
          currencyType,
          balance: numAmount,
          createdAt: currentTimestamp,
          updatedAt: currentTimestamp,
        })
        .returning();

      wallet = newWallet[0];
    } else {
      // Update existing wallet balance
      const updatedWallet = await db
        .update(wallets)
        .set({
          balance: existingWallet[0].balance + numAmount,
          updatedAt: currentTimestamp,
        })
        .where(eq(wallets.id, existingWallet[0].id))
        .returning();

      wallet = updatedWallet[0];
    }

    // Create wallet transaction record
    await db.insert(walletTransactions).values({
      walletId: wallet.id,
      transactionType: 'deposit',
      amount: numAmount,
      currencyType,
      status: 'completed',
      description: 'Funds added to wallet',
      createdAt: currentTimestamp,
    });

    return NextResponse.json(wallet, { status: 200 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}