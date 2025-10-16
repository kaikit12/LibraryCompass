'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InventoryReports } from '@/components/dashboard/inventory-reports';
import { BulkOperations } from '@/components/dashboard/bulk-operations';
import { DatabaseDebug } from '@/components/debug/database-debug';
import { 
  FileSpreadsheet, 
  Package, 
  TrendingUp, 
  Users, 
  BookOpen,
  BarChart3,
  Upload,
  Settings
} from 'lucide-react';

export default function ReportsPage() {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Báo cáo & Phân tích" 
          description="Tổng hợp các báo cáo chi tiết về hoạt động thư viện."
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDebug(!showDebug)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          {showDebug ? 'Ẩn Debug' : 'Debug'}
        </Button>
      </div>

      {/* Debug section - toggleable */}
      {showDebug && <DatabaseDebug />}

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Tồn kho
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Quản lý hàng loạt
          </TabsTrigger>
          <TabsTrigger value="borrowing" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Mượn/Trả
          </TabsTrigger>
          <TabsTrigger value="readers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Độc giả
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Doanh thu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <InventoryReports />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkOperations />
        </TabsContent>

        <TabsContent value="borrowing">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Báo cáo mượn/trả sách
                </CardTitle>
                <CardDescription>
                  Phân tích hoạt động mượn trả sách theo thời gian
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Báo cáo mượn/trả sách sẽ được triển khai trong phiên bản tiếp theo</p>
                  <Badge variant="secondary" className="mt-2">Sắp ra mắt</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="readers">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Báo cáo độc giả
                </CardTitle>
                <CardDescription>
                  Thống kê và phân tích hoạt động của độc giả
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Báo cáo độc giả sẽ được triển khai trong phiên bản tiếp theo</p>
                  <Badge variant="secondary" className="mt-2">Sắp ra mắt</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Báo cáo doanh thu
                </CardTitle>
                <CardDescription>
                  Phân tích doanh thu từ phí trễ hạn và các dịch vụ khác
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Báo cáo doanh thu đang được phát triển</p>
                  <Badge variant="secondary" className="mt-2">Đang phát triển</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}