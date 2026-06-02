const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://jxjnmejmudihrxdvhzce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4am5tZWptdWRpaHJ4ZHZoemNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDg4NDYsImV4cCI6MjA5NTkyNDg0Nn0.E-_ulU4PpWEdW6A5NXxlLweJ6I5-Ck_Q7Ir5q07DIYw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🧪 Testing Supabase connection...');

  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      console.error('❌ Connection failed:', error);
      return;
    }

    console.log('✅ Supabase connection successful');

    // Check specific sale
    const saleId = 'e44dcdc2-5e53-4dd4-93d8-173d916251c0';
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId);

    if (saleError) {
      console.error('❌ Error fetching sale:', saleError);
      return;
    }

    if (!sale || sale.length === 0) {
      console.log('❌ Sale not found!');
      return;
    }

    console.log('✅ Sale found:', sale[0]);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

testConnection();
