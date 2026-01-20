import axios from "axios";

type PayPalEnv = "sandbox" | "live";

function getPayPalBaseUrl() {
  const env = (process.env.PAYPAL_ENV || "sandbox") as PayPalEnv;
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken(): Promise<string> {
  const baseUrl = getPayPalBaseUrl();
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET manquants dans .env");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await axios.post(
    `${baseUrl}/v1/oauth2/token`,
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const data = res.data as any;
  if (!data?.access_token) throw new Error("Impossible d'obtenir le token PayPal.");
  return data.access_token as string;
}

export async function paypalCreateOrder(params: {
  amount: number;
  currency: string;
  donationId: string;
  returnUrl?: string;
  cancelUrl?: string;
}) {
  const token = await paypalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const returnUrl = params.returnUrl || process.env.DONATIONS_RETURN_URL;
  const cancelUrl = params.cancelUrl || process.env.DONATIONS_CANCEL_URL;

  if (!returnUrl || !cancelUrl) {
    throw new Error("DONATIONS_RETURN_URL / DONATIONS_CANCEL_URL manquants dans .env");
  }

  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: params.donationId,
        amount: {
          currency_code: params.currency || "XAF",
          value: params.amount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "Lap Nomba Foundation",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  const res = await axios.post(`${baseUrl}/v2/checkout/orders`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = res.data as any;
  const orderId = data?.id as string | undefined;
  const approveUrl = (data?.links || []).find((l: any) => l.rel === "approve")?.href as
    | string
    | undefined;

  if (!orderId) throw new Error("PayPal order id manquant (createOrder).");

  return { orderId, approveUrl, raw: data };
}

export async function paypalCaptureOrder(orderId: string) {
  const token = await paypalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const res = await axios.post(
    `${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = res.data as any;
  // captureId est souvent dans purchase_units[0].payments.captures[0].id
  const captureId =
    data?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
    data?.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;

  const status = data?.status as string | undefined;

  return { captureId, status, raw: data };
}

/**
 * Vérification signature webhook (recommandé)
 * PayPal exige: transmission_id, transmission_time, cert_url, auth_algo, transmission_sig, webhook_event, webhook_id
 */
export async function paypalVerifyWebhookSignature(params: {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookEvent: any;
}) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID manquant dans .env");

  const token = await paypalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const body = {
    transmission_id: params.transmissionId,
    transmission_time: params.transmissionTime,
    cert_url: params.certUrl,
    auth_algo: params.authAlgo,
    transmission_sig: params.transmissionSig,
    webhook_id: webhookId,
    webhook_event: params.webhookEvent,
  };

  const res = await axios.post(`${baseUrl}/v1/notifications/verify-webhook-signature`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = res.data as any;
  return data?.verification_status === "SUCCESS";
}