import axios from "axios";
export async function getOrangeToken() {
  const client_id = process.env.ORANGE_CLIENT_ID;
  const client_secret = process.env.ORANGE_CLIENT_SECRET;
  const url = "https://api.sandbox.orange-sonatel.com/oauth/token";
  const params = new URLSearchParams();
  params.append("client_id", client_id || "");
  params.append("client_secret", client_secret || "");
  params.append("grant_type", "client_credentials");
  const res = await axios.post(url, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  return res.data.access_token;
}