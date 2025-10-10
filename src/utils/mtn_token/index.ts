import axios from 'axios';

interface BcAuthorizeResponse {
  auth_req_id?: string;
  interval?: number;
  expires_in?: number;
}

export async function bcAuthorize(
  bearerToken: string,
  targetEnvironment: string,
  callbackUrl?: string
): Promise<BcAuthorizeResponse> {
  const url = 'https://sandbox.momodeveloper.mtn.com/collection/v1_0/bc-authorize';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${bearerToken}`,
    'X-Target-Environment': targetEnvironment,
    'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY || '',
  };
  if (callbackUrl) {
    headers['X-Callback-Url'] = callbackUrl;
  }

  const response = await axios.post(url, {}, { headers });
  return response.data as BcAuthorizeResponse;
}

