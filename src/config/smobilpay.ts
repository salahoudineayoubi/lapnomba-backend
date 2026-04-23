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
  appBaseUrl: required(process.env.APP_BASE_URL, "APP_BASE_URL"),

  consumerKey: required(
    process.env.SMOBILPAY_CONSUMER_KEY,
    "SMOBILPAY_CONSUMER_KEY"
  ),
  consumerSecret: required(
    process.env.SMOBILPAY_CONSUMER_SECRET,
    "SMOBILPAY_CONSUMER_SECRET"
  ),

  tokenUrl: required(
    process.env.SMOBILPAY_TOKEN_URL,
    "SMOBILPAY_TOKEN_URL"
  ),

  orderUrl: required(
    process.env.SMOBILPAY_ORDER_URL,
    "SMOBILPAY_ORDER_URL"
  ),

  orderStatusUrl: required(
    process.env.SMOBILPAY_ORDER_STATUS_URL,
    "SMOBILPAY_ORDER_STATUS_URL"
  ),

  orderDetailsUrl: required(
    process.env.SMOBILPAY_ORDER_DETAILS_URL,
    "SMOBILPAY_ORDER_DETAILS_URL"
  ),

  callbackUrl: required(
    process.env.SMOBILPAY_CALLBACK_URL,
    "SMOBILPAY_CALLBACK_URL"
  ),

  returnUrl: required(
    process.env.SMOBILPAY_RETURN_URL,
    "SMOBILPAY_RETURN_URL"
  ),

  defaultCurrency: process.env.SMOBILPAY_DEFAULT_CURRENCY?.trim() || "XAF",
  defaultLangKey: process.env.SMOBILPAY_DEFAULT_LANG_KEY?.trim() || "en",
  orderVersion: process.env.SMOBILPAY_ORDER_VERSION?.trim() || "V1.2",

  requestTimeoutMs: toNumber(process.env.SMOBILPAY_TIMEOUT_MS, 30000),

  orangeMoneyMerchantCode: required(
    process.env.SMOBILPAY_ORANGE_MERCHANT_CODE,
    "SMOBILPAY_ORANGE_MERCHANT_CODE"
  ),
  orangeMoneyServiceId: toNumber(
    process.env.SMOBILPAY_ORANGE_SERVICE_ID,
    30052
  ),

  mtnMomoMerchantCode: required(
    process.env.SMOBILPAY_MTN_MERCHANT_CODE,
    "SMOBILPAY_MTN_MERCHANT_CODE"
  ),
  mtnMomoServiceId: toNumber(
    process.env.SMOBILPAY_MTN_SERVICE_ID,
    20052
  ),
};

export default smobilpayConfig;