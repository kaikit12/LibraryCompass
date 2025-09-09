// To run this script:
// 1. Install firebase-admin: npm install firebase-admin
// 2. Download your service account key JSON file from the Firebase Console
//    (Project Settings > Service accounts > Generate new private key)
// 3. Place the downloaded file in the root of your project and rename it to "serviceAccountKey.json".
// 4. Set your environment variables by creating a .env file with your project ID.
//    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
// 5. Run the script: node migration.js

const admin = require('firebase-admin');
require('dotenv').config();

// You must download this file from your Firebase console.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

async function migrateReaders() {
  console.log('Starting data migration...');

  const booksSnapshot = await db.collection('books').get();
  const booksMap = new Map();
  booksSnapshot.forEach(doc => {
    booksMap.set(doc.data().title, doc.id);
  });

  console.log(`Loaded ${booksMap.size} books into a title-to-ID map.`);

  const readersRef = db.collection('readers');
  const readersSnapshot = await readersRef.get();

  if (readersSnapshot.empty) {
    console.log('No readers found. Nothing to migrate.');
    return;
  }

  console.log(`Found ${readersSnapshot.size} reader documents to check.`);

  const batch = db.batch();
  let updatesMade = 0;

  readersSnapshot.forEach(readerDoc => {
    const readerData = readerDoc.data();
    
    // Ensure borrowedBooks exists and is an array
    if (!Array.isArray(readerData.borrowedBooks) || readerData.borrowedBooks.length === 0) {
        return; // Skip if no books or not an array
    }
    
    let needsUpdate = false;
    const originalBooks = [...readerData.borrowedBooks];

    const newBorrowedBookIds = originalBooks.map(titleOrId => {
      // Check if it's a title that exists in our map
      if (booksMap.has(titleOrId)) {
        needsUpdate = true;
        // Return the corresponding ID
        return booksMap.get(titleOrId);
      }
      // If it's not a title in the map, we assume it's already an ID (or invalid data)
      // and leave it as is.
      return titleOrId;
    });

    // Only add to batch if an actual change was made
    if (needsUpdate) {
      console.log(`- Reader ${readerDoc.id}: Migrating borrowed books from titles to IDs.`);
      batch.update(readerDoc.ref, { borrowedBooks: newBorrowedBookIds });
      updatesMade++;
    }
  });

  if (updatesMade > 0) {
    await batch.commit();
    console.log(`Migration complete. Updated ${updatesMade} reader documents.`);
  } else {
    console.log('Migration complete. No reader documents required updates.');
  }
}

migrateReaders().catch(error => {
    console.error("Migration failed:", error);
});
