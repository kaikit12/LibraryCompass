# Email Notifications Setup Guide (Resend)

## Overview
LibraryCompass sử dụng [Resend](https://resend.com) để gửi email thông báo tự động cho người dùng.

## Tính năng Email Notifications

### 1. **Due Date Reminders** (Nhắc nhở hạn trả)
- Gửi 3 ngày trước khi sách hết hạn
- Bao gồm: Tên sách, ngày hết hạn, số ngày còn lại
- Template: Màu vàng warning

### 2. **Overdue Notices** (Thông báo quá hạn)
- Gửi khi sách quá hạn: ngày 1, 3, 7, 14+
- Bao gồm: Tên sách, ngày hết hạn, số ngày quá hạn
- Template: Màu đỏ urgent

### 3. **Reservation Ready** (Đặt chỗ sẵn sàng)
- Gửi khi sách đã được trả và sẵn sàng cho người đặt trước
- Bao gồm: Tên sách, thời gian hết hạn đặt chỗ (48 giờ)
- Template: Màu xanh lá success

### 4. **Appointment Confirmed** (Xác nhận hẹn lịch)
- Gửi khi admin xác nhận lịch hẹn mượn sách
- Bao gồm: Tên sách, thời gian nhận sách, điều khoản 2 giờ
- Template: Màu xanh dương info

### 5. **Renewal Approved** (Gia hạn được chấp nhận)
- Gửi khi admin chấp nhận yêu cầu gia hạn
- Bao gồm: Tên sách, ngày hết hạn mới
- Template: Màu xanh lá success

## Setup Instructions

### Bước 1: Tạo tài khoản Resend

1. Truy cập [resend.com](https://resend.com)
2. Đăng ký tài khoản miễn phí
3. Xác thực email của bạn

### Bước 2: Lấy API Key

1. Đăng nhập vào [Resend Dashboard](https://resend.com/overview)
2. Vào mục **API Keys**
3. Click **Create API Key**
4. Đặt tên: `LibraryCompass` (hoặc tên bạn muốn)
5. Copy API key (chỉ hiện 1 lần!)

### Bước 3: Cấu hình Domain (Tùy chọn - Production)

**Dùng domain mặc định (Development):**
- Email sẽ gửi từ: `onboarding@resend.dev`
- Chỉ được gửi đến email bạn đã xác thực

**Dùng domain riêng (Production):**
1. Vào **Domains** trong Resend Dashboard
2. Click **Add Domain**
3. Nhập domain của bạn (ví dụ: `library.com`)
4. Thêm DNS records vào domain provider:
   - SPF record
   - DKIM record
   - DMARC record (optional)
5. Chờ xác thực (thường 5-10 phút)
6. Email sẽ gửi từ: `noreply@library.com`

### Bước 4: Cập nhật Environment Variables

Mở file `.env.local` (hoặc tạo mới từ `.env.example`):

```bash
# Resend Configuration
RESEND_API_KEY=re_YourActualAPIKey123456789
RESEND_FROM_EMAIL=LibraryCompass <onboarding@resend.dev>
NEXT_PUBLIC_APP_URL=https://your-library-domain.com

# Cron Secret (generate random string)
CRON_SECRET=your_random_secret_string_abc123xyz789
```

**Development:**
```bash
RESEND_FROM_EMAIL=LibraryCompass <onboarding@resend.dev>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production:**
```bash
RESEND_FROM_EMAIL=Thư Viện <noreply@your-domain.com>
NEXT_PUBLIC_APP_URL=https://your-library-domain.com
```

### Bước 5: Test Email Sending

#### Test thủ công qua API:

```bash
# Test reservation ready email
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "reservation-ready",
    "to": "your-email@example.com",
    "data": {
      "userName": "Nguyễn Văn A",
      "bookTitle": "Harry Potter và Hòn đá Phù thủy",
      "expiresAt": "2025-10-17T10:00:00Z"
    }
  }'
```

#### Test scheduled notifications:

```bash
# Test due reminders và overdue notices
curl -X POST http://localhost:3000/api/scheduled/send-notifications \
  -H "Authorization: Bearer your_cron_secret"
```

## Scheduled Tasks Setup

### Option 1: Vercel Cron Jobs (Recommended for Vercel)

Tạo file `vercel.json` ở root project:

```json
{
  "crons": [
    {
      "path": "/api/scheduled/send-notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Schedule: Chạy mỗi ngày lúc 9:00 AM UTC

### Option 2: GitHub Actions (Free alternative)

Tạo file `.github/workflows/send-emails.yml`:

```yaml
name: Send Email Notifications

on:
  schedule:
    - cron: '0 9 * * *'  # 9:00 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger notification API
        run: |
          curl -X POST https://your-app-url.com/api/scheduled/send-notifications \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: External Cron Service

Sử dụng services như:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Cronitor](https://cronitor.io)

Setup:
1. URL: `https://your-app.com/api/scheduled/send-notifications`
2. Method: POST
3. Header: `Authorization: Bearer your_cron_secret`
4. Schedule: `0 9 * * *` (Daily at 9 AM)

## Email Templates Customization

Templates được định nghĩa trong `src/lib/email-templates.ts`.

### Customize màu sắc:

```typescript
// Due reminder - Warning (Yellow/Orange)
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

// Overdue - Urgent (Red)
.header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }

// Success (Green)
.header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
```

### Thêm logo:

```html
<div class="header">
  <img src="https://your-domain.com/logo.png" alt="Logo" style="max-width: 120px;">
  <h1>📚 LibraryCompass</h1>
</div>
```

### Customize nội dung:

Sửa trong các hàm template:
- `getDueReminderEmailTemplate()`
- `getOverdueEmailTemplate()`
- `getReservationReadyEmailTemplate()`
- `getAppointmentConfirmedEmailTemplate()`
- `getRenewalApprovedEmailTemplate()`

## Resend Pricing & Limits

### Free Tier:
- ✅ 3,000 emails/month
- ✅ 100 emails/day
- ✅ Unlimited API keys
- ✅ Email analytics
- ❌ Custom domain required for production

### Pro Plan ($20/month):
- ✅ 50,000 emails/month
- ✅ Custom domains
- ✅ Webhooks
- ✅ Email logs (30 days)

### Enterprise:
- ✅ Custom volume
- ✅ Dedicated IPs
- ✅ SLA support

## Troubleshooting

### Email không gửi được:

1. **Check API key:**
   ```bash
   # Test API key
   curl https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{}'
   ```

2. **Check logs:**
   - Xem Console logs trong browser/terminal
   - Check Resend Dashboard → Logs

3. **Domain chưa verify:**
   - Development: Dùng `onboarding@resend.dev`
   - Production: Verify domain trước

4. **Rate limit:**
   - Free: 100 emails/day
   - Nếu vượt → upgrade plan

### Email vào Spam:

1. **Verify domain** (DKIM, SPF, DMARC)
2. **Tránh spam words** trong subject/content
3. **Thêm unsubscribe link**
4. **Warm up domain** (tăng dần số email gửi)

## Best Practices

1. **Rate limiting:**
   - Không gửi quá 100 emails/day (free tier)
   - Batch gửi với delay giữa các emails

2. **Error handling:**
   - Luôn wrap email sending trong try-catch
   - Log lỗi nhưng không fail toàn bộ operation

3. **User preferences:**
   - Cho phép user tắt email notifications
   - Thêm field `emailPreferences` trong user document

4. **Testing:**
   - Test với email cá nhân trước
   - Kiểm tra rendering trên nhiều email clients
   - Preview: [Litmus](https://www.litmus.com), [Email on Acid](https://www.emailonacid.com)

## Support

- Resend Docs: https://resend.com/docs
- Resend Discord: https://resend.com/discord
- GitHub Issues: Report bugs và feature requests
