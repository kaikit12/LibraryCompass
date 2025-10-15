'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { PageHeader } from '@/components/layout/page-header';
import { TwoFactorSettings } from '@/components/auth/two-factor-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user?.uid]);

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'bg-red-600',
      librarian: 'bg-blue-600',
      reader: 'bg-green-600',
    };

    const labels = {
      admin: 'Quản trị viên',
      librarian: 'Thủ thư',
      reader: 'Độc giả',
    };

    return (
      <Badge className={`${variants[role as keyof typeof variants]} text-white`}>
        {labels[role as keyof typeof labels] || role}
      </Badge>
    );
  };

  return (
    <AuthGuard>
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Cài đặt tài khoản"
          description="Quản lý thông tin cá nhân và bảo mật của bạn"
        />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Thông tin cá nhân
              </CardTitle>
              <CardDescription>
                Thông tin cơ bản về tài khoản của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
                        {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{userData?.displayName}</h3>
                      {userData?.role && getRoleBadge(userData.role)}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{userData?.email}</p>
                      </div>
                    </div>

                    {userData?.memberId && (
                      <div className="flex items-center gap-3 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Mã thành viên</p>
                          <p className="font-mono font-medium">{userData.memberId}</p>
                        </div>
                      </div>
                    )}

                    {userData?.createdAt && (
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Ngày tham gia</p>
                          <p className="font-medium">
                            {format(
                              new Date(userData.createdAt),
                              'dd MMMM yyyy',
                              { locale: vi }
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <div className="space-y-6">
            {loading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ) : (
              <TwoFactorSettings
                userId={user?.uid || ''}
                isEnabled={userData?.twoFactorEnabled || false}
                onUpdate={fetchUserData}
              />
            )}
          </div>
        </div>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Bảo mật & Quyền riêng tư
            </CardTitle>
            <CardDescription>
              Các tính năng bảo mật đang hoạt động cho tài khoản của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Xác thực hai yếu tố (2FA)</p>
                  <p className="text-sm text-muted-foreground">
                    Bảo vệ tài khoản với mã xác thực từ ứng dụng di động
                  </p>
                </div>
                {userData?.twoFactorEnabled ? (
                  <Badge variant="default" className="bg-green-600">
                    Đã bật
                  </Badge>
                ) : (
                  <Badge variant="secondary">Chưa bật</Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Xác thực email</p>
                  <p className="text-sm text-muted-foreground">
                    Email của bạn đã được xác minh
                  </p>
                </div>
                <Badge variant="default" className="bg-green-600">
                  Đã xác minh
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
