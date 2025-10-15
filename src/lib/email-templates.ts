import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DueReminderEmailData {
  userName: string;
  bookTitle: string;
  dueDate: Date;
  daysUntilDue: number;
}

interface OverdueEmailData {
  userName: string;
  bookTitle: string;
  dueDate: Date;
  daysOverdue: number;
}

interface ReservationReadyEmailData {
  userName: string;
  bookTitle: string;
  expiresAt: Date;
}

interface AppointmentConfirmedEmailData {
  userName: string;
  bookTitle: string;
  pickupTime: Date;
}

interface RenewalApprovedEmailData {
  userName: string;
  bookTitle: string;
  newDueDate: Date;
}

/**
 * Email template for due date reminder (3 days before)
 */
export function getDueReminderEmailTemplate(data: DueReminderEmailData) {
  const { userName, bookTitle, dueDate, daysUntilDue } = data;
  const formattedDate = format(dueDate, 'dd/MM/yyyy', { locale: vi });

  return {
    subject: `⏰ Nhắc nhở: Sách "${bookTitle}" sắp đến hạn trả`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .book-info { background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 5px; }
          .warning { color: #f59e0b; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 LibraryCompass</h1>
            <p>Nhắc nhở hạn trả sách</p>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            
            <p class="warning">⏰ Sách bạn đang mượn sắp đến hạn trả!</p>
            
            <div class="book-info">
              <h3>📖 ${bookTitle}</h3>
              <p><strong>Ngày hết hạn:</strong> ${formattedDate}</p>
              <p><strong>Còn lại:</strong> ${daysUntilDue} ngày</p>
            </div>
            
            <p>Vui lòng trả sách đúng hạn để tránh phí phạt và giúp người khác có cơ hội mượn sách.</p>
            
            <p>Nếu bạn cần thêm thời gian, hãy gửi yêu cầu gia hạn qua hệ thống.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-books" class="button">Xem sách đang mượn</a>
            
            <div class="footer">
              <p>Email tự động từ LibraryCompass</p>
              <p>Vui lòng không trả lời email này</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

/**
 * Email template for overdue notice
 */
export function getOverdueEmailTemplate(data: OverdueEmailData) {
  const { userName, bookTitle, dueDate, daysOverdue } = data;
  const formattedDate = format(dueDate, 'dd/MM/yyyy', { locale: vi });

  return {
    subject: `🚨 Khẩn cấp: Sách "${bookTitle}" đã quá hạn`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .book-info { background: white; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 5px; }
          .urgent { color: #ef4444; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 LibraryCompass</h1>
            <p>Thông báo sách quá hạn</p>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            
            <p class="urgent">⚠️ Sách bạn đang mượn đã quá hạn!</p>
            
            <div class="book-info">
              <h3>📖 ${bookTitle}</h3>
              <p><strong>Ngày hết hạn:</strong> ${formattedDate}</p>
              <p><strong>Số ngày quá hạn:</strong> ${daysOverdue} ngày</p>
            </div>
            
            <p>Vui lòng trả sách ngay để tránh tích lũy thêm phí phạt.</p>
            
            <p><strong>Lưu ý:</strong> Phí phạt có thể được áp dụng cho mỗi ngày trễ hạn.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-books" class="button">Trả sách ngay</a>
            
            <div class="footer">
              <p>Email tự động từ LibraryCompass</p>
              <p>Vui lòng liên hệ thư viện nếu có thắc mắc</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

/**
 * Email template for reservation ready notification
 */
export function getReservationReadyEmailTemplate(data: ReservationReadyEmailData) {
  const { userName, bookTitle, expiresAt } = data;
  const formattedDate = format(expiresAt, 'dd/MM/yyyy HH:mm', { locale: vi });

  return {
    subject: `📚 Sách "${bookTitle}" đã sẵn sàng để mượn!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .book-info { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 5px; }
          .success { color: #10b981; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .expiry-warning { background: #fef3c7; padding: 15px; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 LibraryCompass</h1>
            <p>Sách đã sẵn sàng!</p>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            
            <p class="success">✅ Sách bạn đặt trước đã sẵn sàng để mượn!</p>
            
            <div class="book-info">
              <h3>📖 ${bookTitle}</h3>
              <p>Sách hiện đã có sẵn tại thư viện. Bạn có thể đến mượn trong thời gian sớm nhất.</p>
            </div>
            
            <div class="expiry-warning">
              <strong>⏰ Lưu ý quan trọng:</strong>
              <p>Đặt chỗ của bạn sẽ hết hạn vào: <strong>${formattedDate}</strong></p>
              <p>Vui lòng đến mượn trước thời gian này, nếu không sách sẽ được chuyển cho người tiếp theo trong hàng chờ.</p>
            </div>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-books" class="button">Xem đặt chỗ của tôi</a>
            
            <div class="footer">
              <p>Email tự động từ LibraryCompass</p>
              <p>Chúc bạn đọc sách vui vẻ!</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

/**
 * Email template for appointment confirmed
 */
export function getAppointmentConfirmedEmailTemplate(data: AppointmentConfirmedEmailData) {
  const { userName, bookTitle, pickupTime } = data;
  const formattedDate = format(pickupTime, 'dd/MM/yyyy HH:mm', { locale: vi });

  return {
    subject: `✅ Xác nhận hẹn lịch mượn sách "${bookTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .book-info { background: white; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 5px; }
          .success { color: #3b82f6; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .time-warning { background: #fef3c7; padding: 15px; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 LibraryCompass</h1>
            <p>Xác nhận hẹn lịch</p>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            
            <p class="success">✅ Lịch hẹn mượn sách của bạn đã được xác nhận!</p>
            
            <div class="book-info">
              <h3>📖 ${bookTitle}</h3>
              <p><strong>Thời gian nhận sách:</strong> ${formattedDate}</p>
            </div>
            
            <div class="time-warning">
              <strong>⏰ Điều khoản quan trọng:</strong>
              <p>Vui lòng đến đúng giờ đã hẹn. Nếu trễ quá 2 giờ mà không thông báo, lịch hẹn sẽ tự động hủy.</p>
            </div>
            
            <p>Chúng tôi rất mong được phục vụ bạn!</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-books" class="button">Xem lịch hẹn của tôi</a>
            
            <div class="footer">
              <p>Email tự động từ LibraryCompass</p>
              <p>Hẹn gặp bạn tại thư viện!</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

/**
 * Email template for renewal approved
 */
export function getRenewalApprovedEmailTemplate(data: RenewalApprovedEmailData) {
  const { userName, bookTitle, newDueDate } = data;
  const formattedDate = format(newDueDate, 'dd/MM/yyyy', { locale: vi });

  return {
    subject: `✅ Yêu cầu gia hạn cho "${bookTitle}" đã được chấp nhận`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .book-info { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 5px; }
          .success { color: #10b981; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 LibraryCompass</h1>
            <p>Gia hạn được chấp nhận</p>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            
            <p class="success">✅ Yêu cầu gia hạn của bạn đã được chấp nhận!</p>
            
            <div class="book-info">
              <h3>📖 ${bookTitle}</h3>
              <p><strong>Ngày hết hạn mới:</strong> ${formattedDate}</p>
            </div>
            
            <p>Bạn có thể tiếp tục giữ sách đến ngày hết hạn mới.</p>
            
            <p>Vui lòng trả sách đúng hạn. Chúc bạn đọc sách vui vẻ!</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-books" class="button">Xem sách đang mượn</a>
            
            <div class="footer">
              <p>Email tự động từ LibraryCompass</p>
              <p>Cảm ơn bạn đã sử dụng thư viện!</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
