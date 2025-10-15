'use client';

import { BookActions } from "@/components/books/book-actions";
import { PageHeader } from "@/components/layout/page-header";
import { ExportBooksButton } from "@/components/books/export-books-button";
import { useAuth } from "@/context/auth-context";

export default function BooksPage() {
    const { user } = useAuth();
    const isAdminOrLibrarian = user?.role === 'admin' || user?.role === 'librarian';
    
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader 
                    title="Kho sách" 
                    description="Thêm, chỉnh sửa và theo dõi sách trong thư viện."
                />
                {isAdminOrLibrarian && <ExportBooksButton />}
            </div>
            <BookActions />
        </div>
    );
}
