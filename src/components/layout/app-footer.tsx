"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { LibrarySettings } from "@/lib/types";
import { Mail, Phone, MapPin } from "lucide-react";

export function AppFooter() {
  const [settings, setSettings] = useState<LibrarySettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, "settings", "library");
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as LibrarySettings);
      }
    } catch (error) {
      console.error("Error loading footer settings:", error);
    }
  };

  // Default values if settings not loaded
  const copyright = settings?.copyright || "© 2025 Thư viện Compass. All rights reserved.";
  const email = settings?.email;
  const phone = settings?.phone;
  const address = settings?.address;

  return (
    <footer className="border-t bg-background">
      <div className="container py-8 px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Library Info */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              {settings?.libraryName || "Thư viện Compass"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Hệ thống quản lý thư viện hiện đại và hiệu quả
            </p>
          </div>

          {/* Contact Info */}
          {(email || phone || address) && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Liên hệ</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                {email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${email}`} className="hover:text-foreground transition-colors">
                      {email}
                    </a>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${phone}`} className="hover:text-foreground transition-colors">
                      {phone}
                    </a>
                  </div>
                )}
                {address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>{address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Liên kết</h3>
            <div className="space-y-2 text-sm">
              <Link href="/books" className="block text-muted-foreground hover:text-foreground transition-colors">
                Kho sách
              </Link>
              <a href="/my-books" className="block text-muted-foreground hover:text-foreground transition-colors">
                Trang cá nhân
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Bản quyền</h3>
            <p className="text-sm text-muted-foreground">{copyright}</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>Made with ❤️ for libraries</p>
        </div>
      </div>
    </footer>
  );
}
