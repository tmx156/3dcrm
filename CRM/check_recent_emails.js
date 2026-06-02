const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jxjnmejmudihrxdvhzce.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4am5tZWptdWRpaHJ4ZHZoemNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDg4NDYsImV4cCI6MjA5NTkyNDg0Nn0.E-_ulU4PpWEdW6A5NXxlLweJ6I5-Ck_Q7Ir5q07DIYw'
);

async function checkRecentEmails() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: emails, error } = await supabase
    .from('messages')
    .select('id, recipient_email, subject, created_at, content')
    .eq('type', 'email')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📧 Emails processed in last 5 minutes:', emails?.length || 0);
  if (emails && emails.length > 0) {
    emails.forEach((email, i) => {
      console.log(`${i+1}. ${new Date(email.created_at).toLocaleString()} - ${email.subject} - ${email.recipient_email}`);
    });
  } else {
    console.log('❌ No emails processed in the last 5 minutes');
    console.log('💡 This means the email poller is connected but not receiving new emails');
  }
}

checkRecentEmails().catch(console.error);
