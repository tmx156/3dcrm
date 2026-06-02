const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jxjnmejmudihrxdvhzce.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4am5tZWptdWRpaHJ4ZHZoemNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDg4NDYsImV4cCI6MjA5NTkyNDg0Nn0.E-_ulU4PpWEdW6A5NXxlLweJ6I5-Ck_Q7Ir5q07DIYw'
);

async function checkAllEmails() {
  console.log('🔍 Checking ALL emails in CRM database...\n');

  const { data: emails, error } = await supabase
    .from('messages')
    .select('id, recipient_email, subject, created_at, status, content')
    .eq('type', 'email')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📧 TOTAL EMAILS IN DATABASE: ${emails?.length || 0}`);
  console.log('='.repeat(80));

  if (emails && emails.length > 0) {
    // Group by date for better analysis
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    const todayEmails = emails.filter(e => new Date(e.created_at).toDateString() === today);
    const yesterdayEmails = emails.filter(e => new Date(e.created_at).toDateString() === yesterday);
    const olderEmails = emails.filter(e => {
      const date = new Date(e.created_at).toDateString();
      return date !== today && date !== yesterday;
    });

    console.log(`📅 TODAY (${today}): ${todayEmails.length} emails`);
    console.log(`📅 YESTERDAY (${yesterday}): ${yesterdayEmails.length} emails`);
    console.log(`📅 OLDER: ${olderEmails.length} emails\n`);

    console.log('📧 MOST RECENT EMAILS:');
    emails.slice(0, 5).forEach((email, i) => {
      console.log(`${i+1}. "${email.subject}" from ${email.recipient_email}`);
      console.log(`   Created: ${new Date(email.created_at).toLocaleString()}`);
      console.log(`   Status: ${email.status}`);
      console.log(`   Content Length: ${email.content ? email.content.length : 0}`);
      console.log('');
    });
  } else {
    console.log('❌ No emails found in database');
  }

  console.log('✅ Email audit complete!');
}

checkAllEmails().catch(console.error);
