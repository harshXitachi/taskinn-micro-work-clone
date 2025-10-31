import checkoutNodeJssdk from '@paypal/checkout-server-sdk';

// PayPal environment setup
function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are not configured');
  }

  // Use sandbox for testing, live for production
  if (process.env.NODE_ENV === 'production' && process.env.PAYPAL_MODE === 'live') {
    return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
  }
  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

// PayPal client
function client() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

/**
 * Create PayPal payout for worker withdrawals
 */
export async function createPayPalPayout(
  recipientEmail: string,
  amount: number,
  currency: string = 'USD',
  note?: string
) {
  const paypalClient = client();

  const request = new checkoutNodeJssdk.payouts.PayoutsPostRequest();
  request.requestBody({
    sender_batch_header: {
      sender_batch_id: `batch_${Date.now()}`,
      email_subject: 'You have a payout from TaskInn!',
      email_message: note || 'Thank you for your work on TaskInn platform.',
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: {
          value: amount.toFixed(2),
          currency: currency,
        },
        note: note || 'Payment for completed tasks',
        sender_item_id: `item_${Date.now()}`,
        receiver: recipientEmail,
      },
    ],
  });

  try {
    const response = await paypalClient.execute(request);
    return {
      success: true,
      batchId: response.result.batch_header.payout_batch_id,
      status: response.result.batch_header.batch_status,
      data: response.result,
    };
  } catch (error: any) {
    console.error('PayPal payout error:', error);
    return {
      success: false,
      error: error.message || 'PayPal payout failed',
    };
  }
}

/**
 * Create PayPal order for employer deposits
 */
export async function createPayPalOrder(amount: number, currency: string = 'USD') {
  const paypalClient = client();

  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
        description: 'TaskInn wallet deposit',
      },
    ],
    application_context: {
      brand_name: 'TaskInn',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/employer/payments?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/employer/payments?cancelled=true`,
    },
  });

  try {
    const response = await paypalClient.execute(request);
    return {
      success: true,
      orderId: response.result.id,
      approvalUrl: response.result.links.find((link: any) => link.rel === 'approve')?.href,
      data: response.result,
    };
  } catch (error: any) {
    console.error('PayPal order creation error:', error);
    return {
      success: false,
      error: error.message || 'PayPal order creation failed',
    };
  }
}

/**
 * Capture PayPal order after approval
 */
export async function capturePayPalOrder(orderId: string) {
  const paypalClient = client();

  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const response = await paypalClient.execute(request);
    return {
      success: true,
      captureId: response.result.purchase_units[0].payments.captures[0].id,
      status: response.result.status,
      amount: parseFloat(response.result.purchase_units[0].payments.captures[0].amount.value),
      data: response.result,
    };
  } catch (error: any) {
    console.error('PayPal order capture error:', error);
    return {
      success: false,
      error: error.message || 'PayPal order capture failed',
    };
  }
}

/**
 * Get payout status
 */
export async function getPayoutStatus(payoutBatchId: string) {
  const paypalClient = client();

  const request = new checkoutNodeJssdk.payouts.PayoutsGetRequest(payoutBatchId);

  try {
    const response = await paypalClient.execute(request);
    return {
      success: true,
      status: response.result.batch_header.batch_status,
      data: response.result,
    };
  } catch (error: any) {
    console.error('PayPal payout status error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get payout status',
    };
  }
}