/**
 * Shopify Webhook Utilities
 * Handles HMAC verification and payload parsing for webhook security
 */

import crypto from "crypto";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || "";

/**
 * Verify Shopify webhook HMAC signature
 * @param rawBody - Raw request body as string or Buffer
 * @param hmacHeader - X-Shopify-Hmac-Sha256 header value
 * @returns true if signature is valid
 */
export function verifyShopifyWebhook(
  rawBody: string | Buffer,
  hmacHeader: string | null
): boolean {
  if (!SHOPIFY_WEBHOOK_SECRET) {
    console.warn("[Webhook] SHOPIFY_WEBHOOK_SECRET not configured, skipping verification");
    return true; // Allow in development if secret not set
  }

  if (!hmacHeader) {
    console.error("[Webhook] Missing X-Shopify-Hmac-Sha256 header");
    return false;
  }

  try {
    const bodyString = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
    const calculatedHmac = crypto
      .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
      .update(bodyString, "utf8")
      .digest("base64");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedHmac),
      Buffer.from(hmacHeader)
    );

    if (!isValid) {
      console.error("[Webhook] HMAC verification failed");
    }

    return isValid;
  } catch (error) {
    console.error("[Webhook] Error verifying HMAC:", error);
    return false;
  }
}

/**
 * Parse webhook payload from request
 * @param request - Next.js Request object
 * @returns Parsed JSON payload or null if invalid
 */
export async function parseWebhookPayload<T = any>(
  request: Request
): Promise<{ payload: T; isValid: boolean }> {
  try {
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
    const rawBody = await request.text();

    const isValid = verifyShopifyWebhook(rawBody, hmacHeader);

    if (!isValid) {
      return { payload: null as any, isValid: false };
    }

    const payload = JSON.parse(rawBody) as T;
    return { payload, isValid: true };
  } catch (error) {
    console.error("[Webhook] Error parsing payload:", error);
    return { payload: null as any, isValid: false };
  }
}

/**
 * Standard webhook response (200 OK)
 * Shopify requires 200 response within 5 seconds
 */
export function respondToWebhook() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Webhook error response
 */
export function respondToWebhookError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
