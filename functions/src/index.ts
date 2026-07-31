import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

export const sendWhatsApp = onRequest({ cors: true }, async (req, res) => {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const { phone, message } = req.body;

    if (!phone || !message) {
      res.status(400).json({ error: "Missing phone or message in payload" });
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const senderNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_SENDER_NUMBER;

    if (!accountSid || !authToken || !senderNumber) {
      console.error("Twilio environment variables missing on function server.");
      res.status(500).json({ error: "Twilio backend config missing on server" });
      return;
    }

    // Standardize destination phone number format (whatsapp:+91xxxxxxxxxx)
    let formattedTo = phone.trim();
    if (!formattedTo.startsWith("whatsapp:")) {
      if (formattedTo.length === 10) {
        formattedTo = `whatsapp:+91${formattedTo}`;
      } else if (formattedTo.length === 12 && formattedTo.startsWith("91")) {
        formattedTo = `whatsapp:+${formattedTo}`;
      } else if (!formattedTo.startsWith("+")) {
        formattedTo = `whatsapp:+${formattedTo}`;
      } else {
        formattedTo = `whatsapp:${formattedTo}`;
      }
    }

    // Standardize sender phone number format (whatsapp:+xxxxxxxxxxx)
    let formattedFrom = senderNumber.trim();
    if (!formattedFrom.startsWith("whatsapp:")) {
      formattedFrom = `whatsapp:${formattedFrom.startsWith("+") ? "" : "+"}${formattedFrom}`;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const bodyParams = new URLSearchParams();
    bodyParams.append("To", formattedTo);
    bodyParams.append("From", formattedFrom);
    bodyParams.append("Body", message);

    const twilioResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: bodyParams.toString(),
    });

    const responseData = await twilioResponse.json() as any;

    if (!twilioResponse.ok) {
      console.error("Twilio API responded with error:", responseData);
      res.status(twilioResponse.status).json({ error: responseData.message || "Twilio send failed" });
      return;
    }

    res.status(200).json({ success: true, messageSid: responseData.sid });
  } catch (error: any) {
    console.error("Error in sendWhatsApp function:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});
