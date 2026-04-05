/**
 * Unified Notification Service for Healthify AI
 * Webhook URL: https://adityabp1008.app.n8n.cloud/webhook/7a3480e1-5696-4f32-996e-1e553eded191
 */

export const WEBHOOK_URL = "https://adityabp1008.app.n8n.cloud/webhook/7a3480e1-5696-4f32-996e-1e553eded191";
export const RECIPIENT_PHONE = "whatsapp:+917483147208";

/**
 * Sends a notification payload to the n8n webhook.
 * Supports WhatsApp, Email, and Database storage mapping in n8n.
 */
export async function sendNotification(phone: string, message: string, email: string) {
  try {
    // Data Validation with Fallbacks
    const validatedPhone = phone || RECIPIENT_PHONE;
    const validatedEmail = email || "user@gmail.com";
    const validatedMessage = message || "No message content provided.";

    const payload = {
      phone: validatedPhone,
      email: validatedEmail,
      message: validatedMessage,
      timestamp: new Date().toISOString()
    };

    console.log("Sending webhook data...", payload);

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.text();
    console.log("Webhook sent successfully", data);
    return data;
  } catch (error) {
    console.error("Webhook error:", error);
    throw error;
  }
}

// Keep the old name as an alias for backward compatibility during transition if needed, 
// but we will update all callers.
export const sendWhatsAppNotification = sendNotification;
