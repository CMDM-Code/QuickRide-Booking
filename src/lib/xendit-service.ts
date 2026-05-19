/**
 * xendit-service.ts — Xendit Payment Integration
 *
 * Handles Xendit API integration for payment processing.
 * Supports card payments, virtual accounts, and e-wallets.
 */

const XENDIT_API_KEY = process.env.NEXT_PUBLIC_XENDIT_API_KEY || 'xnd_development_QWCiI77m7u6tPVVu4WD3rJW1Qx4Z0BXplsNIqqq991uLw0gjwBJ1zabXoTg6';
const XENDIT_API_URL = 'https://api.xendit.co';

export interface XenditPaymentRequest {
  amount: number;
  currency?: string;
  payment_method: 'CARD' | 'VIRTUAL_ACCOUNT' | 'EWALLET' | 'QR_CODE';
  card_details?: {
    token_id?: string;
    card_number?: string;
    card_expiry?: string;
    card_cvn?: string;
    cardholder_name?: string;
  };
  customer_details?: {
    given_names: string;
    surname: string;
    email: string;
    phone: string;
  };
  metadata?: Record<string, any>;
}

export interface XenditPaymentResponse {
  id: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REQUIRES_ACTION';
  amount: number;
  currency: string;
  payment_method: string;
  actions?: {
    url?: string;
    method?: string;
  };
  error?: string;
}

/**
 * Creates a payment invoice using Xendit API
 */
export async function createXenditInvoice(
  amount: number,
  description: string,
  customerEmail: string,
  externalId: string
): Promise<XenditPaymentResponse> {
  try {
    const response = await fetch(`${XENDIT_API_URL}/v2/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(XENDIT_API_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: externalId,
        amount,
        description,
        invoice_duration: 86400, // 24 hours
        currency: 'PHP',
        customer: {
          email: customerEmail,
        },
        success_redirect_url: `${window.location.origin}/dashboard/payments?status=success`,
        failure_redirect_url: `${window.location.origin}/dashboard/payments?status=failed`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create Xendit invoice');
    }

    return {
      id: data.id,
      status: 'PENDING',
      amount: data.amount,
      currency: data.currency,
      payment_method: 'INVOICE',
      actions: {
        url: data.invoice_url,
        method: 'GET',
      },
    };
  } catch (error: any) {
    console.error('Xendit invoice creation error:', error);
    throw error;
  }
}

/**
 * Creates a card payment using Xendit API
 */
export async function createXenditCardPayment(
  request: XenditPaymentRequest
): Promise<XenditPaymentResponse> {
  try {
    const response = await fetch(`${XENDIT_API_URL}/payment_requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(XENDIT_API_KEY + ':')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `req-${Date.now()}`,
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency || 'PHP',
        payment_method: {
          type: 'CARD',
          card: {
            token_id: request.card_details?.token_id,
            card_number: request.card_details?.card_number,
            card_expiry: request.card_details?.card_expiry,
            card_cvn: request.card_details?.card_cvn,
            cardholder_name: request.card_details?.cardholder_name,
          },
        },
        customer: request.customer_details,
        metadata: request.metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to create Xendit card payment');
    }

    return {
      id: data.id,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      payment_method: 'CARD',
      actions: data.actions,
    };
  } catch (error: any) {
    console.error('Xendit card payment error:', error);
    throw error;
  }
}

/**
 * Creates a QR code payment using Xendit API
 */
export async function createXenditQRPayment(
  amount: number,
  externalId: string,
  customerEmail: string
): Promise<XenditPaymentResponse> {
  try {
    const response = await fetch(`${XENDIT_API_URL}/qr_codes`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(XENDIT_API_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: externalId,
        type: 'DYNAMIC',
        amount,
        currency: 'PHP',
        metadata: {
          customer_email: customerEmail,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create Xendit QR payment');
    }

    return {
      id: data.id,
      status: 'PENDING',
      amount: data.amount,
      currency: data.currency,
      payment_method: 'QR_CODE',
      actions: {
        url: data.qr_string,
        method: 'QR',
      },
    };
  } catch (error: any) {
    console.error('Xendit QR payment error:', error);
    throw error;
  }
}

/**
 * Checks payment status by invoice ID
 */
export async function getXenditPaymentStatus(invoiceId: string): Promise<XenditPaymentResponse> {
  try {
    const response = await fetch(`${XENDIT_API_URL}/v2/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(XENDIT_API_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get Xendit payment status');
    }

    return {
      id: data.id,
      status: data.status === 'PAID' ? 'SUCCEEDED' : data.status === 'EXPIRED' ? 'FAILED' : 'PENDING',
      amount: data.amount,
      currency: data.currency,
      payment_method: 'INVOICE',
    };
  } catch (error: any) {
    console.error('Xendit payment status error:', error);
    throw error;
  }
}

/**
 * Generates a payment URL for redirect-based payment
 */
export function generateXenditPaymentUrl(invoiceUrl: string): string {
  return invoiceUrl;
}
