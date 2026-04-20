const required = (value: string | undefined, name: string): string => {
  if (!value || !value.trim()) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value.trim();
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const smobilpayConfig = {
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4000",

  consumerKey: required(
    process.env.SMOBILPAY_CONSUMER_KEY,
    "SMOBILPAY_CONSUMER_KEY"
  ),
  consumerSecret: required(
    process.env.SMOBILPAY_CONSUMER_SECRET,
    "SMOBILPAY_CONSUMER_SECRET"
  ),

  tokenUrl:
    process.env.SMOBILPAY_TOKEN_URL ||
    "https://api.enkap-staging.maviance.info/token",

  orderUrl:
    process.env.SMOBILPAY_ORDER_URL ||
    "https://api.enkap-staging.maviance.info/purchase/v1.2/api/order",

  orderStatusUrl:
    process.env.SMOBILPAY_ORDER_STATUS_URL ||
    "https://api.enkap-staging.maviance.info/purchase/v1.2/api/order/status",

  orderDetailsUrl:
    process.env.SMOBILPAY_ORDER_DETAILS_URL ||
    "https://api.enkap-staging.maviance.info/purchase/v1.2/api/order",

  callbackUrl:
    process.env.SMOBILPAY_CALLBACK_URL ||
    `${process.env.APP_BASE_URL || "http://localhost:4000"}/api/smobilpay/webhook`,

  returnUrl:
    process.env.SMOBILPAY_RETURN_URL ||
    "https://donate.lapnomba.org/payment/return",

  defaultCurrency: process.env.SMOBILPAY_DEFAULT_CURRENCY || "XAF",
  defaultLangKey: process.env.SMOBILPAY_DEFAULT_LANG_KEY || "en",
  orderVersion: process.env.SMOBILPAY_ORDER_VERSION || "V1.2",

  requestTimeoutMs: toNumber(process.env.SMOBILPAY_TIMEOUT_MS, 30000),

  /**
   * Mapping CashIn pour dons
   * Orange Money donation => CMORANGEOM / 30052
   * MTN MoMo donation => CMMTNMOMO / 20052
   */
  orangeMoneyMerchantCode:
    process.env.SMOBILPAY_ORANGE_MERCHANT_CODE || "CMORANGEOM",
  orangeMoneyServiceId: toNumber(
    process.env.SMOBILPAY_ORANGE_SERVICE_ID,
    30052
  ),

  mtnMomoMerchantCode:
    process.env.SMOBILPAY_MTN_MERCHANT_CODE || "CMMTNMOMO",
  mtnMomoServiceId: toNumber(process.env.SMOBILPAY_MTN_SERVICE_ID, 20052),
};

export default smobilpayConfig;