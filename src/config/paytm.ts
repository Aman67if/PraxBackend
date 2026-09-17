// @ts-ignore — no official types for paytmchecksum
import PaytmChecksum from 'paytmchecksum';
import axios from 'axios';

// Paytm configuration
const PAYTM_CONFIG = {
  merchantId: process.env.PAYTM_MERCHANT_ID || '',
  merchantKey: process.env.PAYTM_MERCHANT_KEY || '',
  website: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
  channelId: process.env.PAYTM_CHANNEL_ID || 'WEB',
  callbackUrl: process.env.PAYTM_CALLBACK_URL || 'http://localhost:5000/api/payments/callback',
  isProduction: process.env.NODE_ENV === 'production',
};

function getBaseUrl(): string {
  return PAYTM_CONFIG.isProduction
    ? 'https://secure.paytmpayments.com'
    : 'https://securestage.paytmpayments.com';
}

export interface InitiateTransactionInput {
  orderId: string;
  amount: number;
  customerId: string;
  email?: string;
  phone?: string;
}

export async function initiateTransaction(input: InitiateTransactionInput) {
  const { orderId, amount, customerId } = input;

  const paytmParams = {
    body: {
      requestType: 'Payment',
      mid: PAYTM_CONFIG.merchantId,
      websiteName: PAYTM_CONFIG.website,
      orderId: orderId,
      callbackUrl: PAYTM_CONFIG.callbackUrl,
      txnAmount: {
        value: amount.toFixed(2),
        currency: 'INR',
      },
      userInfo: {
        custId: customerId,
      },
    },
    head: { signature: "" }
  };

  // Generate signature for the body
  const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), PAYTM_CONFIG.merchantKey);
  paytmParams.head = { signature: checksum };

  // Call Paytm Initiate Transaction API
  const url = `${getBaseUrl()}/theia/api/v1/initiateTransaction?mid=${PAYTM_CONFIG.merchantId}&orderId=${orderId}`;

  // console.log("PAYTM REQUEST URL:", url);
  // console.log("PAYTM REQUEST BODY:", JSON.stringify(paytmParams, null, 2));

  const response = await axios.post(url, paytmParams, {
    headers: { 'Content-Type': 'application/json' },
  });

  // console.log("PAYTM RESPONSE BODY:", JSON.stringify(response.data, null, 2));

  const responseBody = response.data.body;
  if (responseBody.resultInfo.resultStatus !== 'S') {
    throw new Error(`Paytm API Error: ${responseBody.resultInfo.resultMsg}`);
  }

  // Return the data required by frontend to show payment page
  return {
    mid: PAYTM_CONFIG.merchantId,
    orderId,
    txnToken: responseBody.txnToken,
    txnUrl: `${getBaseUrl()}/theia/api/v1/showPaymentPage?mid=${PAYTM_CONFIG.merchantId}&orderId=${orderId}`,
  };
}

export async function verifyTransaction(responseParams: Record<string, string>) {
  const { CHECKSUMHASH, ...params } = responseParams;

  if (!CHECKSUMHASH) {
    throw new Error('Missing checksum in Paytm response.');
  }

  // Verify checksum using Paytm SDK
  const isValid: boolean = await PaytmChecksum.verifySignature(params as any, PAYTM_CONFIG.merchantKey, CHECKSUMHASH);

  return {
    orderId: params.ORDERID,
    txnId: params.TXNID,
    status: params.STATUS,
    amount: parseFloat(params.TXNAMOUNT || '0'),
    isSuccess: params.STATUS === 'TXN_SUCCESS',
    isValid,
  };
}

export default PAYTM_CONFIG;


