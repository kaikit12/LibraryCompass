"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { LibrarySettings } from "@/lib/types";
import { Save, Image as ImageIcon, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default function CustomPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Partial<LibrarySettings>>({
    libraryName: "Thư viện Compass",
    copyright: "© 2025 Thư viện Compass. All rights reserved.",
    email: "contact@library.com",
    phone: "0123456789",
    address: "123 Đường ABC, Quận XYZ, TP. HCM",
    logoUrl: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, "settings", "library");
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as LibrarySettings;
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  // Convert Cloudinary console URL to public URL
  const convertCloudinaryUrl = (url: string): string => {
    // Check if it's a Cloudinary console/thumbnail URL
    if (url.includes('res-console.cloudinary.com') || url.includes('/thumbnails/')) {
      // Extract the public_id from the URL
      const match = url.match(/\/v\d+\/(.+?)(\/|$)/);
      if (match) {
        const encodedId = match[1];
        // Decode base64 if it looks encoded
        try {
          const decoded = atob(encodedId);
          // Extract actual image path
          const imageMatch = decoded.match(/([^\/]+)$/);
          if (imageMatch) {
            const publicId = imageMatch[1];
            // Return public Cloudinary URL
            return `https://res.cloudinary.com/dmzidnd3m/image/upload/${publicId}`;
          }
        } catch (e) {
          console.error("Failed to decode Cloudinary URL:", e);
        }
      }
    }
    return url;
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    // Validate email format if provided
    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      toast({
        variant: "destructive",
        title: "❌ Email không hợp lệ",
        description: "Vui lòng nhập địa chỉ email đúng định dạng",
      });
      return;
    }
    
    // Validate phone format if provided  
    if (settings.phone && !/^(03|05|07|08|09)\d{8}$/.test(settings.phone)) {
      toast({
        variant: "destructive",
        title: "❌ Số điện thoại không hợp lệ",
        description: "Vui lòng nhập số điện thoại Việt Nam (10 số, bắt đầu bằng 03/05/07/08/09)",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Convert Cloudinary URL if needed
      let logoUrl = settings.logoUrl || "";
      if (logoUrl) {
        logoUrl = convertCloudinaryUrl(logoUrl);
      }

      const settingsData: LibrarySettings = {
        id: "library",
        libraryName: settings.libraryName || "Thư viện Compass",
        copyright: settings.copyright || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        logoUrl,
        updatedAt: new Date(),
      };

      const settingsRef = doc(db, "settings", "library");
      await setDoc(settingsRef, settingsData);

      toast({
        title: "✅ Lưu thành công",
        description: logoUrl !== settings.logoUrl 
          ? "Đã chuyển đổi link Cloudinary sang URL công khai" 
          : "Cài đặt đã được cập nhật",
      });
      
      await loadSettings();
      
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "❌ Lỗi",
        description: error.message || "Không thể lưu cài đặt",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="Tùy chỉnh"
        description="Cấu hình thông tin và giao diện thư viện"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Logo thư viện</CardTitle>
            <CardDescription>
              Nhập URL ảnh logo từ internet (Imgur, Cloudinary, hoặc link trực tiếp)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              {settings.logoUrl && !imageError ? (
                <div className="relative w-48 h-48 border-2 border-dashed rounded-lg overflow-hidden bg-white">
                  <img
                    src={settings.logoUrl}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                    onError={() => {
                      setImageError(true);
                      toast({
                        variant: "destructive",
                        title: "❌ Lỗi tải ảnh",
                        description: "Link ảnh không hợp lệ hoặc không thể truy cập",
                      });
                    }}
                    onLoad={() => setImageError(false)}
                  />
                </div>
              ) : (
                <div className="w-48 h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-muted gap-2">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  {imageError && (
                    <p className="text-xs text-destructive text-center px-4">
                      Không thể tải ảnh.<br/>Vui lòng kiểm tra link.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL Logo</Label>
              <Input
                id="logoUrl"
                type="url"
                placeholder="https://i.imgur.com/example.png hoặc link ảnh từ Google"
                value={settings.logoUrl || ""}
                onChange={(e) => {
                  setSettings({ ...settings, logoUrl: e.target.value });
                  setImageError(false); // Reset error when URL changes
                }}
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <ExternalLink className="h-3 w-3 mt-0.5" />
                <span>
                  Cách lấy link ảnh:<br/>
                  • Tìm ảnh trên Google → Click chuột phải → &ldquo;Sao chép địa chỉ hình ảnh&rdquo;<br/>
                  • Hoặc upload lên <a href="https://imgur.com/upload" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Imgur</a> → Copy Direct Link
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="library-name">Tên thư viện</Label>
              <Input
                id="library-name"
                value={settings.libraryName || ""}
                onChange={(e) =>
                  setSettings({ ...settings, libraryName: e.target.value })
                }
                placeholder="Thư viện Compass"
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin Footer</CardTitle>
            <CardDescription>
              Thông tin sẽ hiển thị ở cuối trang
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="copyright">Bản quyền</Label>
              <Input
                id="copyright"
                value={settings.copyright || ""}
                onChange={(e) =>
                  setSettings({ ...settings, copyright: e.target.value })
                }
                placeholder="© 2025 Thư viện Compass"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ""}
                onChange={(e) =>
                  setSettings({ ...settings, email: e.target.value })
                }
                placeholder="contact@library.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                type="tel"
                value={settings.phone || ""}
                onChange={(e) =>
                  setSettings({ ...settings, phone: e.target.value })
                }
                placeholder="0123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Textarea
                id="address"
                value={settings.address || ""}
                onChange={(e) =>
                  setSettings({ ...settings, address: e.target.value })
                }
                placeholder="123 Đường ABC, Quận XYZ, TP. HCM"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>Đang lưu...</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Lưu cài đặt
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
