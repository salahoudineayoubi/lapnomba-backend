import axios from "axios";
import smobilpayConfig from "../../config/smobilpay";
import logger from "../../utils/logger";

export interface SmobilpayTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

const getBasicAuthorizationHeader = (): string => {
  const credentials = `${smobilpayConfig.consumerKey}:${smobilpayConfig.consumerSecret}`;
  const encoded = Buffer.from(credentials).toString("base64");
  return `Basic ${encoded}`;
};

const isTokenStillValid = (): boolean => {
  if (!cachedToken) return false;
  const now = Date.now();
  return now < cachedTokenExpiresAt;
};

export const clearSmobilpayTokenCache = (): void => {
  cachedToken = null;
  cachedTokenExpiresAt = 0;
};

export const getSmobilpayAccessToken = async (): Promise<string> => {
  if (isTokenStillValid() && cachedToken) {
    return cachedToken;
  }

  try {
    const formBody = new URLSearchParams();
    formBody.append("grant_type", "client_credentials");

    const response = await axios.post<SmobilpayTokenResponse>(
      smobilpayConfig.tokenUrl,
      formBody.toString(),
      {
        timeout: smobilpayConfig.requestTimeoutMs,
        headers: {
          Authorization: getBasicAuthorizationHeader(),
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = response.data;

    if (!data?.access_token) {
      throw new Error("Aucun access_token reçu depuis Smobilpay.");
    }

    cachedToken = data.access_token;

    // marge de sécurité de 60 secondes
    const expiresInMs = Math.max((data.expires_in || 0) - 60, 30) * 1000;
    cachedTokenExpiresAt = Date.now() + expiresInMs;

    logger.info("✅ Token Smobilpay généré avec succès");

    return cachedToken;
  } catch (error: any) {
    logger.error(
      "❌ Erreur génération token Smobilpay :",
      error?.response?.data || error?.message || error
    );
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Impossible de générer le token Smobilpay."
    );
  }
};

export const getSmobilpayAuthorizationHeader = async (): Promise<string> => {
  const token = await getSmobilpayAccessToken();
  return `Bearer ${token}`;
};