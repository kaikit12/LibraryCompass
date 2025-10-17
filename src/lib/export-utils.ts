import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Book, BorrowRecord, Reader, FirebaseTimestamp } from './types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) {
  const csv = Papa.unparse(data, {
    header: true,
    columns: headers,
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel UTF-8
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export borrowing history to CSV
 */
export function exportBorrowingHistoryToCSV(borrowals: BorrowRecord[], books: Book[]) {
  const bookMap = new Map(books.map(b => [b.id, b]));
  
  const data = borrowals.map(b => {
    const book = bookMap.get(b.bookId);
    return {
      'Mã mượn': b.id,
      'Tên sách': book?.title || 'N/A',
      'Tác giả': book?.author || 'N/A',
      'Người mượn': b.userName,
      'Email': b.userEmail,
      'Ngày mượn': format((b.borrowedAt as FirebaseTimestamp).toDate(), 'dd/MM/yyyy HH:mm', { locale: vi }),
      'Ngày hết hạn': format((b.dueDate as FirebaseTimestamp).toDate(), 'dd/MM/yyyy', { locale: vi }),
      'Ngày trả': b.returnedAt ? format((b.returnedAt as FirebaseTimestamp).toDate(), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'Chưa trả',
      'Trạng thái': b.returnedAt ? 'Đã trả' : (new Date() > (b.dueDate as FirebaseTimestamp).toDate() ? 'Quá hạn' : 'Đang mượn'),
    };
  });

  const filename = `lich-su-muon-sach_${format(new Date(), 'yyyy-MM-dd_HHmm')}`;
  exportToCSV(data, filename);
}

/**
 * Export inventory to CSV
 */
export function exportInventoryToCSV(books: Book[]) {
  const data = books.map(book => ({
    'Mã sách': book.libraryId,
    'ISBN': book.isbn || 'N/A',
    'Tên sách': book.title,
    'Tác giả': book.author,
    'Thể loại': book.genre,
    'Năm xuất bản': book.publicationYear || 'N/A',
    'Tổng số': book.quantity,
    'Còn lại': book.available,
    'Đang mượn': book.quantity - book.available,
    'Đánh giá': book.rating ? book.rating.toFixed(1) : 'N/A',
    'Số đánh giá': book.reviewCount || 0,
    'Tổng lượt mượn': book.totalBorrows || 0,
  }));

  const filename = `ton-kho-sach_${format(new Date(), 'yyyy-MM-dd_HHmm')}`;
  exportToCSV(data, filename);
}

/**
 * Export overdue books to CSV
 */
export function exportOverdueBooksToCSV(borrowals: BorrowRecord[], books: Book[]) {
  const bookMap = new Map(books.map(b => [b.id, b]));
  const now = new Date();
  
  const overdueData = borrowals
    .filter(b => !b.returnedAt && (b.dueDate as FirebaseTimestamp).toDate() < now)
    .map(b => {
      const book = bookMap.get(b.bookId);
      const daysOverdue = Math.floor((now.getTime() - (b.dueDate as FirebaseTimestamp).toDate().getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        'Tên sách': book?.title || 'N/A',
        'Mã sách': book?.libraryId || 'N/A',
        'Người mượn': b.userName,
        'Email': b.userEmail,
        'Ngày mượn': format((b.borrowedAt as FirebaseTimestamp).toDate(), 'dd/MM/yyyy', { locale: vi }),
        'Ngày hết hạn': format((b.dueDate as FirebaseTimestamp).toDate(), 'dd/MM/yyyy', { locale: vi }),
        'Số ngày quá hạn': daysOverdue,
      };
    });

  const filename = `sach-qua-han_${format(new Date(), 'yyyy-MM-dd_HHmm')}`;
  exportToCSV(overdueData, filename);
}

/**
 * Export user list to CSV
 */
export function exportUsersToCSV(users: Reader[]) {
  const data = users.map(user => ({
    'Tên': user.name,
    'Email': user.email,
    'Vai trò': user.role === 'admin' ? 'Quản trị viên' : user.role === 'librarian' ? 'Thủ thư' : 'Độc giả',
  }));

  const filename = `danh-sach-nguoi-dung_${format(new Date(), 'yyyy-MM-dd_HHmm')}`;
  exportToCSV(data, filename);
}

/**
 * Export borrowing history to PDF
 */
export function exportBorrowingHistoryToPDF(borrowals: BorrowRecord[], books: Book[]) {
  const doc = new jsPDF();
  const bookMap = new Map(books.map(b => [b.id, b]));

  // Title
  doc.setFontSize(18);
  doc.text('LỊCH SỬ MƯỢN SÁCH', 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Ngày xuất: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}`, 14, 30);
  doc.text(`Tổng số giao dịch: ${borrowals.length}`, 14, 36);

  // Table data
  const tableData = borrowals.map(b => {
    const book = bookMap.get(b.bookId);
    return [
      book?.title || 'N/A',
      b.userName,
      format((b.borrowedAt as FirebaseTimestamp).toDate(), 'dd/MM/yyyy', { locale: vi }),
      format((b.dueDate as FirebaseTimestamp).toDate(), 'dd/MM/yyyy', { locale: vi }),
      b.returnedAt ? format((b.returnedAt as FirebaseTimestamp).toDate(), 'dd/MM/yyyy', { locale: vi }) : 'Chưa trả',
      b.returnedAt ? 'Đã trả' : (new Date() > (b.dueDate as FirebaseTimestamp).toDate() ? 'Quá hạn' : 'Đang mượn'),
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['Tên sách', 'Người mượn', 'Ngày mượn', 'Hạn trả', 'Ngày trả', 'Trạng thái']],
    body: tableData,
    styles: { fontSize: 9, font: 'helvetica' },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const filename = `lich-su-muon-sach_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(filename);
}

/**
 * Export inventory to PDF
 */
export function exportInventoryToPDF(books: Book[]) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text('TỒN KHO SÁCH', 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Ngày xuất: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}`, 14, 30);
  doc.text(`Tổng số sách: ${books.length}`, 14, 36);
  
  const totalCopies = books.reduce((sum, b) => sum + b.quantity, 0);
  const availableCopies = books.reduce((sum, b) => sum + b.available, 0);
  doc.text(`Tổng bản: ${totalCopies} | Còn lại: ${availableCopies} | Đang mượn: ${totalCopies - availableCopies}`, 14, 42);

  // Table data
  const tableData = books.map(book => [
    book.libraryId || '',
    book.title,
    book.author,
    book.genre,
    book.quantity.toString(),
    book.available.toString(),
    (book.quantity - book.available).toString(),
    book.rating ? book.rating.toFixed(1) : 'N/A',
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['Mã', 'Tên sách', 'Tác giả', 'Thể loại', 'Tổng', 'Còn', 'Mượn', 'Đ.giá']],
    body: tableData,
    styles: { fontSize: 8, font: 'helvetica' },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25 },
      4: { cellWidth: 12 },
      5: { cellWidth: 12 },
      6: { cellWidth: 12 },
      7: { cellWidth: 15 },
    },
  });

  const filename = `ton-kho-sach_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(filename);
}

/**
 * Export overdue books to PDF
 */
export function exportOverdueBooksToPDF(borrowals: BorrowRecord[], books: Book[]) {
  const doc = new jsPDF();
  const bookMap = new Map(books.map(b => [b.id, b]));
  const now = new Date();
  
  const overdueData = borrowals.filter(b => !b.returnedAt && (b.dueDate as FirebaseTimestamp).toDate() < now);

  // Title
  doc.setFontSize(18);
  doc.text('BÁO CÁO SÁCH QUÁ HẠN', 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Ngày xuất: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}`, 14, 30);
  doc.text(`Tổng số sách quá hạn: ${overdueData.length}`, 14, 36);

  // Table data
  const tableData = overdueData.map(b => {
    const book = bookMap.get(b.bookId);
    const daysOverdue = Math.floor((now.getTime() - (b.dueDate as FirebaseTimestamp).toDate().getTime()) / (1000 * 60 * 60 * 24));
    
    return [
      book?.title || 'N/A',
      book?.libraryId || 'N/A',
      b.userName,
      b.userEmail,
      format((b.dueDate as FirebaseTimestamp).toDate(), 'dd/MM/yyyy', { locale: vi }),
      daysOverdue.toString(),
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['Tên sách', 'Mã sách', 'Người mượn', 'Email', 'Hạn trả', 'Quá hạn (ngày)']],
    body: tableData,
    styles: { fontSize: 9, font: 'helvetica' },
    headStyles: { fillColor: [239, 68, 68], textColor: 255 },
    alternateRowStyles: { fillColor: [254, 242, 242] },
  });

  const filename = `sach-qua-han_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(filename);
}

/**
 * Backup Firestore data to JSON
 */
export function backupFirestoreToJSON(data: any, collectionName: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `backup_${collectionName}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
