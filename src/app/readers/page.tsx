'use client';

import { ReaderActions } from "@/components/readers/reader-actions";
import { PageHeader } from "@/components/layout/page-header";
import { ExportUsersButton } from "@/components/readers/export-users-button";
import { useAuth } from "@/context/auth-context";

export default function ReadersPage() {
    const { user } = useAuth();
    const isAdminOrLibrarian = user?.role === 'admin' || user?.role === 'librarian';
    
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <PageHeader 
                    title="Quản lý bạn đọc" 
                    description="Quản lý hồ sơ người dùng và lịch sử mượn/trả."
                />
                {isAdminOrLibrarian && <ExportUsersButton />}
            </div>
            <ReaderActions />
        </div>
    );
}
