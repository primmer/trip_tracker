import admin from 'firebase-admin';

async function main() {
  admin.initializeApp({ projectId: 'primco-trip-tracker' });
  const db = admin.firestore();

  const doc = await db.doc('secrets/google_tokens').get();
  if (doc.exists) {
    const data = doc.data();
    console.log('=== Firestore Token ===');
    console.log('  Update time:', doc.updateTime?.toDate().toISOString());
    console.log('  Refresh token prefix:', data?.refresh_token?.substring(0, 50));

    // Check if this is the same as .env
    const envToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (envToken) {
      console.log('\n=== .env Token ===');
      console.log('  Prefix:', envToken.substring(0, 50));
      console.log('\n=== Match ===');
      console.log('  Tokens identical:', data?.refresh_token === envToken);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
