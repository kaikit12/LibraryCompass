# Tính năng mới: Thể loại tùy chỉnh & Phí trễ tùy chỉnh

## 🎨 Thể loại tùy chỉnh (Custom Genres)

### Cách sử dụng:

1. **Thêm/Chỉnh sửa sách:**
   - Mở dialog "Thêm sách mới" hoặc "Chỉnh sửa sách"
   - Trong phần "🏷️ Phân loại & Mã định danh"

2. **Chọn thể loại "Khác":**
   - Tick vào checkbox "Khác" trong danh sách thể loại
   - Một ô input mới sẽ xuất hiện: "Thể loại tùy chỉnh"

3. **Nhập thể loại mới:**
   - Gõ tên thể loại mới (ví dụ: "Triết học", "Khoa học tự nhiên")
   - Có thể nhập nhiều thể loại cách nhau bằng dấu phẩy
   - Ví dụ: `Triết học, Khoa học tự nhiên, Nấu ăn`

4. **Lưu sách:**
   - Nhấn "💾 Lưu sách"
   - Thể loại mới sẽ được lưu vào database
   - Thể loại mới sẽ xuất hiện trong danh sách cho lần sau

### Đặc điểm:

✅ **Tự động lưu vào database:** Thể loại custom được lưu vào collection `customGenres` trong Firestore

✅ **Hiển thị với icon đặc biệt:** Thể loại custom có icon ✨ để phân biệt

✅ **Tái sử dụng:** Sau khi tạo, thể loại custom sẽ xuất hiện trong danh sách cho tất cả sách

✅ **Thay thế "Khác":** Khi chọn "Khác" và nhập custom genre, "Khác" sẽ tự động bị xóa khỏi danh sách thể loại của sách

### Database Schema:

```javascript
// Collection: customGenres
{
  name: "Triết học",           // Tên thể loại
  createdAt: Timestamp,        // Thời gian tạo
  createdBy: "userId"          // User ID người tạo
}
```

---

## 💰 Phí trễ tùy chỉnh (Late Fee Per Day)

### Quyền hạn:

- 🔓 **Admin & Librarian:** Có thể chỉnh sửa phí trễ cho mỗi sách
- 🔒 **Reader:** Không thể chỉnh sửa (ô input bị disabled)

### Cách sử dụng:

1. **Đăng nhập với role admin/librarian**

2. **Thêm/Chỉnh sửa sách:**
   - Mở dialog thêm/sửa sách
   - Tìm phần "📊 Số lượng & Phí"

3. **Nhập phí trễ:**
   - Ô "Phí trễ/ngày (VNĐ)" sẽ được bật
   - Nhập số tiền (ví dụ: 5000, 10000)
   - Giá trị mặc định: 0 VNĐ

4. **Lưu sách:**
   - Phí trễ sẽ được lưu vào trường `lateFeePerDay` của sách

### Ứng dụng:

- **Sách giá trị cao:** Phí trễ cao hơn (10,000 - 20,000 VNĐ/ngày)
- **Sách thông thường:** Phí trễ trung bình (5,000 VNĐ/ngày)
- **Sách cũ/bình dân:** Phí trễ thấp (1,000 - 3,000 VNĐ/ngày)
- **Sách miễn phí:** Phí trễ = 0 VNĐ

### UI/UX:

✅ **Badge hiển thị quyền:** Admin/Librarian thấy badge "Chỉnh sửa được"

✅ **Tooltip thông báo:** Reader thấy thông báo "🔒 Chỉ admin/thủ thư mới có thể chỉnh sửa phí trễ"

✅ **Placeholder hữu ích:** "Mặc định: 5,000 VNĐ/ngày"

✅ **Validation:** Phí trễ phải >= 0 (không được âm)

---

## 📝 Ví dụ sử dụng

### Thêm sách với thể loại custom:

```
Tiêu đề: "Sapiens: Lược sử loài người"
Tác giả: "Yuval Noah Harari"
Thể loại: [Khác] → Nhập "Lịch sử nhân loại, Nhân học"
→ Kết quả: Sách có 2 thể loại: "Lịch sử nhân loại" và "Nhân học"
```

### Cấu hình phí trễ:

```
Sách quý hiếm (ví dụ: "Đắc Nhân Tâm - Bản gốc"):
→ Phí trễ: 20,000 VNĐ/ngày

Sách giáo khoa:
→ Phí trễ: 5,000 VNĐ/ngày

Sách miễn phí (ví dụ: tạp chí):
→ Phí trễ: 0 VNĐ/ngày
```

---

## 🚀 Deploy

Sau khi cập nhật code, cần tạo index Firestore cho collection `customGenres`:

### Firestore Indexes:

```javascript
// Collection: customGenres
// Fields: name (Ascending)
```

### Environment Variables:

Không cần thêm biến môi trường mới.

---

## 🐛 Troubleshooting

### Thể loại custom không xuất hiện:

1. Kiểm tra Firestore collection `customGenres`
2. Kiểm tra console log có lỗi không
3. Refresh trang để reload dữ liệu

### Không chỉnh sửa được phí trễ:

1. Kiểm tra role user: phải là `admin` hoặc `librarian`
2. Logout và login lại
3. Kiểm tra Firestore user document có role đúng không

### Lỗi khi lưu sách:

1. Kiểm tra validation: title, author, genre, quantity đều bắt buộc
2. Phí trễ phải >= 0
3. Kiểm tra Firebase permissions

---

## 📊 Statistics

- **Custom Genres Collection:** Real-time sync với Firestore
- **Late Fee Range:** 0 - ∞ VNĐ
- **Supported Roles:** Admin, Librarian (chỉnh sửa phí trễ)
- **Total Pre-defined Genres:** 13 (bao gồm "Khác")
