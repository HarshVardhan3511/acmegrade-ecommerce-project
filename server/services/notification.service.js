const nodemailer = require('nodemailer');
const { run } = require('../db');

const GST_RATE = 0.18; // 18% GST
let emailTransport;

function getEmailTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  if (!emailTransport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    emailTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return emailTransport;
}

async function recordNotification(userId, orderId, type, subject, message) {
  try {
    await run(
      'INSERT INTO notifications (user_id, order_id, type, subject, message) VALUES (?, ?, ?, ?, ?)',
      [userId, orderId, type, subject, message]
    );
  } catch (err) {
    console.error(`Failed to log ${type} notification:`, err.message);
  }
}

async function sendEmailNotification(user, orderId, subject, message) {
  const transport = getEmailTransport();
  if (transport && user.email) {
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject,
        text: message,
      });
      console.log(`Email notification sent for order #${orderId} to user ${user.id}.`);
    } catch (err) {
      console.error(`Email notification failed for order #${orderId}:`, err.message);
    }
  } else {
    console.log(`[EMAIL SIMULATED] ${subject} (user ${user.id}, order #${orderId})`);
  }

  await recordNotification(user.id, orderId, 'email', subject, message);
}

async function sendSMSNotification(user, orderId, message) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  const phone = user.phone;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER && phone) {
    try {
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: phone, From: TWILIO_FROM_NUMBER, Body: message }),
        }
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Twilio returned ${response.status}: ${details.slice(0, 300)}`);
      }
      console.log(`SMS notification sent for order #${orderId} to user ${user.id}.`);
    } catch (err) {
      console.error(`SMS notification failed for order #${orderId}:`, err.message);
    }
  } else if (phone) {
    console.log(`[SMS SIMULATED] Order #${orderId} notification for user ${user.id}. Configure Twilio to send SMS.`);
  }

  if (phone) {
    await recordNotification(user.id, orderId, 'sms', 'SMS Alert', message);
  }
}

async function notifyOrderPlaced(user, order) {
  const emailMsg = `
Dear ${user.name},

Your order #${order.id} has been placed successfully.

Order Summary:
- Subtotal:       ₹${Number(order.subtotal).toFixed(2)}
${order.coupon_code ? `- Coupon (${order.coupon_code}): -₹${Number(order.discount_amount).toFixed(2)}` : ''}
- GST (18%):      ₹${Number(order.gst_amount).toFixed(2)}
- Total Payable:  ₹${Number(order.total_amount).toFixed(2)}
- Payment Mode:   ${order.payment_method}

Delivery to: ${order.shipping_name}, ${order.shipping_city} - ${order.shipping_pincode}

Thank you for shopping with ShopEasy!
  `.trim();

  const smsMsg = `ShopEasy: Order #${order.id} confirmed. Total: ₹${Number(order.total_amount).toFixed(2)}. Track it in My Orders at /orders.html.`;

  await sendEmailNotification(user, order.id, `Order #${order.id} Confirmed - ShopEasy`, emailMsg);
  await sendSMSNotification(user, order.id, smsMsg);
}

async function notifyOrderStatusUpdate(user, order, newStatus) {
  const statusMessages = {
    Shipped: `Your order #${order.id} has shipped. Expected delivery: 2-3 business days.`,
    Delivered: `Your order #${order.id} has been delivered. Thank you for shopping with ShopEasy!`,
    Cancelled: `Your order #${order.id} has been cancelled.`,
  };
  const message = statusMessages[newStatus] || `Your order #${order.id} status is now ${newStatus}.`;

  await sendEmailNotification(user, order.id, `Order #${order.id} ${newStatus} - ShopEasy`, message);
  await sendSMSNotification(user, order.id, `ShopEasy: ${message}`);
}

module.exports = {
  sendEmailNotification,
  sendSMSNotification,
  notifyOrderPlaced,
  notifyOrderStatusUpdate,
  GST_RATE,
};
