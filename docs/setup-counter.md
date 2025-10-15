# 🔧 Setup Instructions - Member ID Counter

## ⚠️ QUAN TRỌNG: Tạo Counter Document

Sau khi deploy các changes, bạn cần tạo counter document trong Firestore để hệ thống Member ID hoạt động.

### Cách 1: Tạo thủ công trong Firebase Console

1. Mở [Firebase Console](https://console.firebase.google.com)
2. Chọn project của bạn
3. Vào **Firestore Database**
4. Bấm **Start collection**
5. **Collection ID:** `counters`
6. Bấm **Next**
7. **Document ID:** `memberId`
8. Thêm field:
   - **Field:** `value`
   - **Type:** `number`
   - **Value:** `0` (hoặc số lớn nhất của Member ID hiện tại nếu đã có users)
9. Bấm **Save**

### Cách 2: Chạy initialization script

Tạo file `scripts/init-counter.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  // Paste your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeCounter() {
  console.log('Initializing Member ID counter...');
  
  try {
    // Get all users to find max memberId
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const memberIds = snapshot.docs
      .map(doc => doc.data().memberId)
      .filter(id => typeof id === 'number');
    
    const maxId = memberIds.length > 0 ? Math.max(...memberIds) : 0;
    
    // Create counter document
    const counterRef = doc(db, 'counters', 'memberId');
    await setDoc(counterRef, { value: maxId });
    
    console.log(`✅ Counter initialized with value: ${maxId}`);
    console.log('Next user will get Member ID:', maxId + 1);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

initializeCounter();
```

Chạy:
```bash
node scripts/init-counter.js
```

### Cách 3: Auto-initialize (Recommended)

Counter sẽ tự động được tạo khi user đầu tiên đăng ký sau khi deploy code mới. Giá trị khởi tạo sẽ là `1`.

**Lưu ý:** Nếu đã có users cũ với memberId, nên dùng Cách 1 hoặc 2 để set counter về giá trị đúng.

---

## 🔍 Verify Setup

Sau khi tạo counter, kiểm tra trong Firestore Console:

```
counters/
  └── memberId/
      └── value: <number>
```

Tạo user mới để test:
1. Đăng ký tài khoản mới
2. Kiểm tra counter value đã tăng lên chưa
3. Kiểm tra user mới có memberId đúng không

---

## ⚡ Changes Deployed

### ✅ Fixed Bugs:

1. **Race Condition - Member ID**
   - Sử dụng Firestore Transaction với counter document
   - Không còn duplicate Member IDs

2. **Google Login Duplicates**
   - Tự động xóa document cũ sau khi migrate
   - Không còn duplicate users

3. **Phone Validation**
   - Validate đúng format SĐT Việt Nam: 03x, 05x, 07x, 08x, 09x
   - Regex: `/^(03|05|07|08|09)\d{8}$/`

4. **Memory Leak - Email Polling**
   - Tự động stop polling khi email verified
   - Tiết kiệm tài nguyên

5. **Late Fee Cap**
   - Maximum 90 ngày
   - Maximum $50
   - Không còn phí vô hạn

6. **Due Date Validation**
   - Không cho chọn ngày quá khứ
   - Maximum 90 ngày từ hôm nay
   - HTML5 validation

7. **Case-insensitive Search**
   - Search theo tên, email, phone, Member ID
   - Không phân biệt hoa thường

8. **Books Per User Limit**
   - Maximum 5 cuốn/user
   - Thông báo rõ ràng khi đạt limit

9. **Member ID Input**
   - Chỉ cho phép nhập số
   - `inputMode="numeric"` cho mobile keyboard

---

## 📊 Database Structure

### New Collection: `counters`

```
counters/
  └── memberId/
      └── value: number
```

**Purpose:** Track next available Member ID

**Updates:** Atomic increment với Firestore Transaction

---

## 🚀 Next Steps

1. ✅ Deploy code
2. ✅ Tạo counter document
3. ⚠️ Test registration flow
4. ⚠️ Test Google login flow
5. ⚠️ Verify Member IDs không duplicate

---

## 🆘 Troubleshooting

### Issue: "Firebase is not configured"
**Solution:** Check `.env.local` có đầy đủ Firebase config

### Issue: Counter không tăng
**Solution:** 
- Check Firestore permissions
- Verify counter document tồn tại
- Check console logs

### Issue: Duplicate Member IDs
**Solution:**
- Verify counter document đúng giá trị
- Check không có race condition (2 users đăng ký cùng lúc)
- Re-initialize counter nếu cần

---

**Last Updated:** 15/10/2025
