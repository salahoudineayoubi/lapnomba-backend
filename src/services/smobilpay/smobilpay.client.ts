import axios from "axios";
import { getSmobilpayAuthorizationHeader } from "./smobilpay.auth";
import smobilpayConfig from "../../config/smobilpay";
import logger from "../../utils/logger";

export interface SmobilpayApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data: T;
}

const buildHeaders = async (extraHeaders?: Record<string, string>) => {
  const authorization = await getSmobilpayAuthorizationHeader();

  return {
    Authorization: authorization,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extraHeaders,
  };
};

export const smobilpayPost = async <T = any>(
  url: string,
  payload: any,
  extraHeaders?: Record<string, string>
): Promise<SmobilpayApiResponse<T>> => {
  try {
    const headers = await buildHeaders(extraHeaders);

    const response = await axios({
      url,
      method: "POST",
      timeout: smobilpayConfig.requestTimeoutMs,
      headers,
      data: payload,
    });

    return {
      success: true,
      statusCode: response.status,
      data: response.data as T,
    };
  } catch (error: any) {
    logger.error(
      "❌ Erreur POST Smobilpay :",
      error?.response?.data || error?.message || error
    );

    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Erreur lors de l'appel POST Smobilpay."
    );
  }
};

export const smobilpayGet = async <T = any>(
  url: string,
  queryParams?: Record<string, string | number | boolean>,
  extraHeaders?: Record<string, string>
): Promise<SmobilpayApiResponse<T>> => {
  try {
    const headers = await buildHeaders(extraHeaders);

    const response = await axios({
      url,
      method: "GET",
      timeout: smobilpayConfig.requestTimeoutMs,
      headers,
      params: queryParams,
    });

    return {
      success: true,
      statusCode: response.status,
      data: response.data as T,
    };
  } catch (error: any) {
    logger.error(
      "❌ Erreur GET Smobilpay :",
      error?.response?.data || error?.message || error
    );

    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Erreur lors de l'appel GET Smobilpay."
    );
  }
};