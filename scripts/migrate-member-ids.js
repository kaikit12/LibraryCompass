// Migration script to add memberId to existing users
// Run this once to assign member IDs to existing users

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  // Add your Firebase config here
  // You can get this from your Firebase Console
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateMemberIds() {
  console.log('Starting member ID migration...');
  
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const usersWithoutMemberId = snapshot.docs.filter(doc => !doc.data().memberId);
    
    if (usersWithoutMemberId.length === 0) {
      console.log('✅ All users already have member IDs!');
      return;
    }
    
    console.log(`Found ${usersWithoutMemberId.length} users without member IDs`);
    
    // Get existing member IDs to continue sequence
    const existingMemberIds = snapshot.docs
      .map(doc => doc.data().memberId)
      .filter((id): id is number => typeof id === 'number');
    
    let nextMemberId = existingMemberIds.length > 0 ? Math.max(...existingMemberIds) + 1 : 1;
    
    // Update each user
    for (const userDoc of usersWithoutMemberId) {
      const userRef = doc(db, 'users', userDoc.id);
      await updateDoc(userRef, { memberId: nextMemberId });
      console.log(`✅ Assigned member ID ${nextMemberId} to user ${userDoc.data().name || userDoc.id}`);
      nextMemberId++;
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
migrateMemberIds();
