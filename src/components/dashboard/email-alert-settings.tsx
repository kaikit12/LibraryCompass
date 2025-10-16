'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  Save, 
  Send, 
  AlertTriangle, 
  Clock, 
  Settings, 
  TestTube,
  Bell,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';

interface EmailAlertSettings {
  enabled: boolean;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  damagedBookAlert: boolean;
  lostBookAlert: boolean;
  recipients: string[];
  frequency: 'immediate' | 'daily' | 'weekly';
  lastSent?: Date;
}

interface EmailTemplate {
  lowStock: {
    subject: string;
    body: string;
  };
  damaged: {
    subject: string;
    body: string;
  };
  lost: {
    subject: string;
    body: string;
  };
}

const defaultSettings: EmailAlertSettings = {
  enabled: true,
  lowStockThreshold: 2,
  criticalStockThreshold: 0,
  damagedBookAlert: true,
  lostBookAlert: true,
  recipients: [],
  frequency: 'daily'
};

const defaultTemplates: EmailTemplate = {
  lowStock: {
    subject: '🔔 Cảnh báo: Sách sắp hết tồn kho - {{libraryName}}',
    body: `Xin chào {{recipientName}},

Hệ thống thư viện phát hiện có {{count}} đầu sách sắp hết tồn kho (≤ {{threshold}} cuốn).

Danh sách sách cần chú ý:
{{bookList}}

Vui lòng xem xét đặt hàng bổ sung hoặc cập nhật số lượng tồn kho.

Truy cập hệ thống: {{systemUrl}}

Trân trọng,
Hệ thống Thư viện {{libraryName}}`
  },
  damaged: {
    subject: '⚠️ Thông báo: Phát hiện sách hư hỏng - {{libraryName}}',
    body: `Xin chào {{recipientName}},

Hệ thống ghi nhận có {{count}} cuốn sách bị đánh dấu là hư hỏng.

Chi tiết:
{{bookList}}

Vui lòng kiểm tra và quyết định về việc sửa chữa hoặc thay thế.

Truy cập hệ thống: {{systemUrl}}

Trân trọng,
Hệ thống Thư viện {{libraryName}}`
  },
  lost: {
    subject: '🚨 Cảnh báo: Sách bị mất - {{libraryName}}',
    body: `Xin chào {{recipientName}},

Hệ thống ghi nhận có {{count}} cuốn sách bị đánh dấu là mất.

Chi tiết:
{{bookList}}

Vui lòng xem xét các biện pháp bù đắp và cập nhật kho.

Truy cập hệ thống: {{systemUrl}}

Trân trọng,
Hệ thống Thư viện {{libraryName}}`
  }
};

export function EmailAlertSettings() {
  const [settings, setSettings] = useState<EmailAlertSettings>(defaultSettings);
  const [templates, setTemplates] = useState<EmailTemplate>(defaultTemplates);
  const [newRecipient, setNewRecipient] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load email alert settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'emailAlerts'));
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() });
      }

      // Load email templates
      const templatesDoc = await getDoc(doc(db, 'settings', 'emailTemplates'));
      if (templatesDoc.exists()) {
        setTemplates({ ...defaultTemplates, ...templatesDoc.data() });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải cài đặt email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'emailAlerts'), settings);
      await setDoc(doc(db, 'settings', 'emailTemplates'), templates);
      
      toast({
        title: "Thành công",
        description: "Đã lưu cài đặt email cảnh báo",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu cài đặt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    if (newRecipient && !settings.recipients.includes(newRecipient)) {
      setSettings(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient]
      }));
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setSettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;
    
    setSending(true);
    try {
      // Send test email through API
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'test',
          recipient: testEmail,
          data: {
            libraryName: 'Thư viện Compass',
            recipientName: 'Thủ thư',
            count: 3,
            threshold: settings.lowStockThreshold,
            bookList: '• Harry Potter và Hòn đá Phù thủy (0/5 cuốn)\n• Dế Mèn phiêu lưu ký (1/3 cuốn)\n• Tắt đèn (2/4 cuốn)',
            systemUrl: window.location.origin
          }
        }),
      });

      if (response.ok) {
        toast({
          title: "Thành công",
          description: `Đã gửi email thử nghiệm đến ${testEmail}`,
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Lỗi",
        description: "Không thể gửi email thử nghiệm",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Cài đặt email cảnh báo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Cài đặt email cảnh báo tồn kho
              </CardTitle>
              <CardDescription>
                Cấu hình thông báo email tự động cho các vấn đề về tồn kho
              </CardDescription>
            </div>
            <Badge variant={settings.enabled ? "default" : "secondary"}>
              {settings.enabled ? (
                <>
                  <Bell className="h-3 w-3 mr-1" />
                  Đang hoạt động
                </>
              ) : (
                'Tạm dừng'
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Cài đặt chung</TabsTrigger>
          <TabsTrigger value="templates">Mẫu email</TabsTrigger>
          <TabsTrigger value="test">Thử nghiệm</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cấu hình cảnh báo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Kích hoạt email cảnh báo</Label>
                  <p className="text-sm text-muted-foreground">
                    Tự động gửi email khi phát hiện vấn đề tồn kho
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              {/* Thresholds */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lowStock">Ngưỡng tồn kho thấp</Label>
                  <Input
                    id="lowStock"
                    type="number"
                    min="0"
                    value={settings.lowStockThreshold}
                    onChange={(e) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        lowStockThreshold: parseInt(e.target.value) || 0 
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Cảnh báo khi số lượng ≤ giá trị này
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criticalStock">Ngưỡng hết hàng</Label>
                  <Input
                    id="criticalStock"
                    type="number"
                    min="0"
                    value={settings.criticalStockThreshold}
                    onChange={(e) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        criticalStockThreshold: parseInt(e.target.value) || 0 
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Cảnh báo khẩn cấp khi số lượng = giá trị này
                  </p>
                </div>
              </div>

              {/* Alert Types */}
              <div className="space-y-4">
                <Label>Loại cảnh báo</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Sách hư hỏng</div>
                      <p className="text-sm text-muted-foreground">
                        Thông báo khi có sách bị đánh dấu hư hỏng
                      </p>
                    </div>
                    <Switch
                      checked={settings.damagedBookAlert}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, damagedBookAlert: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Sách mất</div>
                      <p className="text-sm text-muted-foreground">
                        Thông báo khi có sách bị đánh dấu mất
                      </p>
                    </div>
                    <Switch
                      checked={settings.lostBookAlert}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, lostBookAlert: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label htmlFor="frequency">Tần suất gửi</Label>
                <Select
                  value={settings.frequency}
                  onValueChange={(value: 'immediate' | 'daily' | 'weekly') => 
                    setSettings(prev => ({ ...prev, frequency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Ngay lập tức</SelectItem>
                    <SelectItem value="daily">Hàng ngày</SelectItem>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipients */}
              <div className="space-y-4">
                <Label>Người nhận email</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="email@example.com"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRecipient();
                      }
                    }}
                  />
                  <Button onClick={addRecipient} variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Thêm
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {settings.recipients.map((email) => (
                    <Badge key={email} variant="secondary" className="cursor-pointer">
                      {email}
                      <button
                        onClick={() => removeRecipient(email)}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                
                {settings.recipients.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Chưa có người nhận nào được cấu hình
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="space-y-6">
            {/* Low Stock Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Mẫu email tồn kho thấp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lowStockSubject">Tiêu đề</Label>
                  <Input
                    id="lowStockSubject"
                    value={templates.lowStock.subject}
                    onChange={(e) => 
                      setTemplates(prev => ({
                        ...prev,
                        lowStock: { ...prev.lowStock, subject: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowStockBody">Nội dung</Label>
                  <Textarea
                    id="lowStockBody"
                    rows={8}
                    value={templates.lowStock.body}
                    onChange={(e) => 
                      setTemplates(prev => ({
                        ...prev,
                        lowStock: { ...prev.lowStock, body: e.target.value }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Damaged Books Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Mẫu email sách hư hỏng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="damagedSubject">Tiêu đề</Label>
                  <Input
                    id="damagedSubject"
                    value={templates.damaged.subject}
                    onChange={(e) => 
                      setTemplates(prev => ({
                        ...prev,
                        damaged: { ...prev.damaged, subject: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="damagedBody">Nội dung</Label>
                  <Textarea
                    id="damagedBody"
                    rows={8}
                    value={templates.damaged.body}
                    onChange={(e) => 
                      setTemplates(prev => ({
                        ...prev,
                        damaged: { ...prev.damaged, body: e.target.value }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lost Books Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Mẫu email sách mất
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lostSubject">Tiêu đề</Label>
                  <Input
                    id="lostSubject"
                    value={templates.lost.subject}
                    onChange={(e) => 
                      setTemplates(prev => ({
                        ...prev,
                        lost: { ...prev.lost, subject: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lostBody">Nội dung</Label>
                  <Textarea
                    id="lostBody"
                    rows={8}
                    value={templates.lost.body}
                    onChange={(e) => 
                      setTemplates(prev => ({
                        ...prev,
                        lost: { ...prev.lost, body: e.target.value }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Biến có thể sử dụng</CardTitle>
                <CardDescription>
                  Các biến này sẽ được thay thế tự động trong email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div><code>{'{{libraryName}}'}</code> - Tên thư viện</div>
                  <div><code>{'{{recipientName}}'}</code> - Tên người nhận</div>
                  <div><code>{'{{count}}'}</code> - Số lượng sách</div>
                  <div><code>{'{{threshold}}'}</code> - Ngưỡng cảnh báo</div>
                  <div><code>{'{{bookList}}'}</code> - Danh sách sách</div>
                  <div><code>{'{{systemUrl}}'}</code> - Link hệ thống</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Thử nghiệm email
              </CardTitle>
              <CardDescription>
                Gửi email thử nghiệm để kiểm tra cấu hình
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Email nhận thử nghiệm</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button 
                onClick={sendTestEmail} 
                disabled={!testEmail || sending}
                className="w-full"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Gửi email thử nghiệm
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={saveSettings} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Lưu cài đặt
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}