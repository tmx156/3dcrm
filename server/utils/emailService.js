require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// ========================================
// TEMPORARY KILL SWITCH - DISABLE SENDING
// ========================================
const EMAIL_SENDING_DISABLED = false; // Email sending enabled
// ========================================

console.log('[Gmail API] Email Service: Initializing...');

const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');
const { getAuthedClient } = require('./gmailClient');
const { injectTrackingPixel } = require('./emailTracking');

// The sending address — must match the account authorised via OAuth
const GMAIL_FROM = process.env.GMAIL_USER || process.env.EMAIL_USER;
const FROM_NAME = 'Think Models';

console.log(`[Gmail API] Sending as: ${FROM_NAME} <${GMAIL_FROM || 'NOT SET'}>`);

if (EMAIL_SENDING_DISABLED) {
  console.log('[Gmail API] EMAIL SENDING DISABLED (kill switch active)');
}

/**
 * Send an email via the Gmail API.
 *
 * Signature is intentionally the same as the old SMTP version so every
 * existing caller (messagingService, scheduler, etc.) keeps working.
 *
 * @param {string} to            - Recipient email address
 * @param {string} subject       - Email subject
 * @param {string} body          - Email body (HTML or plain text)
 * @param {Array}  attachments   - Nodemailer-style attachment objects (optional)
 * @param {string} _accountKey   - Kept for backwards compat, ignored (single account)
 * @param {object} options       - { trackingId } to embed an open-tracking pixel
 * @returns {Promise<{success: boolean, response?: string, error?: string}>}
 */
async function sendEmail(to, subject, body, attachments = [], _accountKey = 'primary', options = {}) {
  const emailId = Math.random().toString(36).substring(2, 8);

  console.log(`[${emailId}] Sending email: ${subject} -> ${to}`);

  // Kill switch
  if (EMAIL_SENDING_DISABLED) {
    console.log(`[${emailId}] EMAIL SENDING DISABLED - not sent`);
    return {
      success: true,
      disabled: true,
      messageId: `<disabled-${emailId}@localhost>`,
      response: 'Email sending temporarily disabled'
    };
  }

  // Validate required fields
  if (!to || !subject || !body) {
    const missing = [!to && 'to', !subject && 'subject', !body && 'body'].filter(Boolean).join(', ');
    const errorMsg = `[${emailId}] Missing required fields: ${missing}`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!GMAIL_FROM) {
    const errorMsg = `[${emailId}] GMAIL_FROM not configured (set GMAIL_USER or EMAIL_USER)`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    // --- Validate & filter attachments ---
    const fs = require('fs').promises;
    const inputAttachments = Array.isArray(attachments) ? attachments : [];
    const validAttachments = [];

    if (inputAttachments.length > 0) {
      for (const att of inputAttachments) {
        if (!att.filename) continue;

        // In-memory attachments (e.g. a photo ZIP built on the fly) arrive as
        // a Buffer rather than a path, so size-check the buffer directly.
        if (att.content) {
          const size = Buffer.isBuffer(att.content) ? att.content.length : 0;
          if (size > 0 && size <= 25 * 1024 * 1024) validAttachments.push(att);
          continue;
        }

        if (!att.path) continue;
        try {
          const stats = await fs.stat(att.path);
          if (stats.size > 0 && stats.size <= 25 * 1024 * 1024) {
            validAttachments.push(att);
          }
        } catch {
          // skip invalid file
        }
      }
      console.log(`[${emailId}] Attachments: ${validAttachments.length}/${inputAttachments.length} valid`);
    }

    // --- Open tracking ---
    // Callers opt in by passing a trackingId and storing it on the message
    // row; the pixel is only injected into HTML bodies.
    const trackedBody = options.trackingId
      ? injectTrackingPixel(body, options.trackingId)
      : body;

    // --- Detect whether body is HTML ---
    const isHtml = /<[a-z][\s\S]*>/i.test(trackedBody);

    // --- Build MIME message with MailComposer ---
    const mailOptions = {
      from: { name: FROM_NAME, address: GMAIL_FROM },
      to,
      subject,
      ...(isHtml ? { html: trackedBody } : { text: trackedBody }),
      attachments: validAttachments,
      headers: {
        'X-Email-ID': emailId,
        'X-Application': 'CRM System'
      }
    };

    const mail = new MailComposer(mailOptions);
    const message = await mail.compile().build();

    // Gmail API requires URL-safe base64
    const raw = message
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // --- Send via Gmail API ---
    const auth = await getAuthedClient(GMAIL_FROM);
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    console.log(`[${emailId}] Sent OK - Gmail ID: ${res.data.id}`);
    return {
      success: true,
      response: `Gmail API OK id=${res.data.id}`,
      messageId: `<${res.data.id}@gmail>`
    };
  } catch (error) {
    console.error(`[${emailId}] Send failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

module.exports = {
  sendEmail,
  FROM_NAME,
  GMAIL_FROM,
  // Legacy exports kept so nothing breaks at require-time
  transporter: null,
  createTransporter: () => null,
  EMAIL_ACCOUNTS: {}
};
