import axios from 'axios';

const MESSAGE_ACTIONS = ['SMS_SENT', 'SMS_RECEIVED', 'SMS_FAILED', 'EMAIL_SENT', 'EMAIL_RECEIVED'];

export const htmlToText = (html) => {
  if (!html || !/<[a-z][\s\S]*>/i.test(html)) return html || '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style, script, head').forEach(el => el.remove());
  return (doc.body?.innerText || doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};

const parseHistory = (bookingHistory) => {
  try {
    const history = typeof bookingHistory === 'string' ? JSON.parse(bookingHistory) : bookingHistory;
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
};

const normalisedBody = (m) => (m.details?.body || '').replace(/\s+/g, ' ').trim().slice(0, 80).toLowerCase();

/**
 * Build a lead's SMS/email conversation, oldest first.
 *
 * Messages live in the messages table (emails, booking confirmations, replies),
 * but custom SMS sent from the CRM only exist in the lead's booking_history,
 * so both are merged and near-identical entries dropped.
 *
 * @param {string} leadId
 * @param {string|Array} [bookingHistory] - the lead's booking_history, if already loaded
 */
export const fetchLeadConversation = async (leadId, bookingHistory) => {
  const fromHistory = parseHistory(bookingHistory)
    .filter(entry => MESSAGE_ACTIONS.includes(entry.action))
    .map(entry => ({
      ...entry,
      details: {
        ...entry.details,
        body: htmlToText(entry.details?.body || entry.details?.message || '')
      }
    }));

  let fromTable = [];
  try {
    const response = await axios.get(`/api/messages/lead/${leadId}`);
    fromTable = (response.data || [])
      .filter(row => row.type === 'sms' || row.type === 'email')
      .map(row => {
        const failed = row.status === 'failed' || row.delivery_status === 'failed';
        const sent = !!row.sent_by || row.status === 'sent' || row.email_status === 'sent' || failed;
        const channel = row.type.toUpperCase();
        return {
          id: row.id,
          action: failed ? `${channel}_FAILED` : `${channel}_${sent ? 'SENT' : 'RECEIVED'}`,
          timestamp: row.sent_at || row.created_at,
          details: {
            subject: row.subject,
            body: htmlToText(row.type === 'sms'
              ? (row.sms_body || row.content || '')
              : (row.content || row.email_body || '')),
            error_message: row.error_message
          }
        };
      });
  } catch (error) {
    console.error('Error fetching messages for lead:', error);
  }

  const merged = [...fromTable, ...fromHistory]
    .filter(m => m.timestamp && !isNaN(new Date(m.timestamp).getTime()))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const deduped = [];
  for (const m of merged) {
    const channel = m.action.split('_')[0];
    const incoming = m.action.endsWith('RECEIVED');
    const text = normalisedBody(m);
    const t = new Date(m.timestamp).getTime();
    const dup = deduped.some(d =>
      d.action.split('_')[0] === channel &&
      d.action.endsWith('RECEIVED') === incoming &&
      normalisedBody(d) === text &&
      Math.abs(new Date(d.timestamp).getTime() - t) < 5 * 60 * 1000
    );
    if (!dup) deduped.push(m);
  }
  return deduped;
};
