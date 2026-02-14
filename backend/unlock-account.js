// Unlock a specific account via API call
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔓 Account Unlock Utility\n');

rl.question('Enter email or username to unlock: ', async (loginId) => {
  if (!loginId) {
    console.log('❌ No email/username provided');
    rl.close();
    return;
  }

  try {
    // Call the unlock API endpoint
    const response = await fetch('http://localhost:3010/api/auth/admin/unlock-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need an admin token here
      },
      body: JSON.stringify({ loginId })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.message}`);
      
      // Also clear settings cache
      const cacheResponse = await fetch('http://localhost:3010/api/auth/admin/clear-settings-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const cacheData = await cacheResponse.json();
      if (cacheData.success) {
        console.log('✅ Settings cache cleared');
      }
      
      console.log('\n✅ Done! User can now login.');
    } else {
      console.log(`❌ Error: ${data.error}`);
    }
  } catch (error) {
    console.error('❌ Failed to unlock account:', error.message);
  }

  rl.close();
});
