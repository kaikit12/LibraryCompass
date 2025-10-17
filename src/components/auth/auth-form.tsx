
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Verify2FADialog } from "./verify-2fa-dialog";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Tên phải có ít nhất 2 ký tự." }),
  email: z.string().email({ message: "Email không hợp lệ." }),
  phone: z.string()
    .regex(/^(03|05|07|08|09)\d{8}$/, { 
      message: "Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng Việt Nam (03x, 05x, 07x, 08x, 09x)." 
    }),
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự." }),
});

const loginSchema = z.object({
  email: z.string().email({ message: "Email không hợp lệ." }),
  password: z.string().min(1, { message: "Vui lòng nhập mật khẩu." }),
});

interface AuthFormProps {
  mode: "login" | "register";
}

type RegisterValues = z.infer<typeof registerSchema>;
type LoginValues = z.infer<typeof loginSchema>;

export function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === "login";
  const { login, loginWithGoogle, register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string>('');
  const [pendingLoginData, setPendingLoginData] = useState<{email: string, password: string} | null>(null);

  const form = useForm<RegisterValues | LoginValues>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    // Provide default values matching the active mode to satisfy types
    defaultValues: (isLogin
      ? { email: "", password: "" }
      : { name: "", email: "", phone: "", password: "" }) as RegisterValues | LoginValues,
  });

  async function onSubmit(values: RegisterValues | LoginValues) {
    setIsLoading(true);
    try {
      if (isLogin) {
        // Check if user has 2FA enabled before logging in
        const { email, password } = values as LoginValues;
        
        // First, attempt to get user ID by email to check 2FA status
        // Note: This is a simplified approach. In production, you might want to
        // create a dedicated API endpoint to check 2FA status without exposing user data
        const { auth } = await import('@/lib/firebase');
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        
        // Check if 2FA is enabled
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().twoFactorEnabled) {
          // Sign out temporarily and show 2FA dialog
          await userCredential.user.getIdToken(); // Ensure session is valid
          setPendingUserId(userId);
          setPendingLoginData({ email, password });
          setShow2FADialog(true);
          setIsLoading(false);
          return;
        }
        
        // No 2FA, complete login normally
        await login(email, password);
        toast({ title: "✅ Đăng nhập thành công", description: "Chào mừng bạn trở lại!" });
      } else {
        const { name, email, phone, password } = values as z.infer<typeof registerSchema>;
        await register(name, email, password, phone);
        toast({ 
          title: "✅ Đăng ký thành công", 
          description: "Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư của bạn.",
          duration: 6000
        });
      }
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = (error as { code?: string })?.code?.replace('auth/', '').replace(/-/g, ' ') || "Đã xảy ra lỗi không xác định.";
      toast({
        variant: "destructive",
        title: `❌ ${isLogin ? 'Đăng nhập' : 'Đăng ký'} thất bại`,
        description: errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1) + '.',
      });
    } finally {
        setIsLoading(false);
    }
  }

  const handle2FASuccess = async () => {
    // 2FA verified, complete login
    if (pendingLoginData) {
      try {
        await login(pendingLoginData.email, pendingLoginData.password);
        toast({ 
          title: "✅ Đăng nhập thành công", 
          description: "Chào mừng bạn trở lại!" 
        });
        setPendingUserId('');
        setPendingLoginData(null);
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "❌ Đăng nhập thất bại",
          description: "Đã xảy ra lỗi khi hoàn tất đăng nhập.",
        });
      }
    }
  };

  const handle2FACancel = async () => {
    // Sign out the temporary session
    const { auth } = await import('@/lib/firebase');
    await auth.signOut();
    setPendingUserId('');
    setPendingLoginData(null);
    toast({
      title: "Đăng nhập đã hủy",
      description: "Bạn đã hủy xác thực 2FA.",
    });
  };

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast({ 
        title: "✅ Đăng nhập thành công", 
        description: "Chào mừng bạn đăng nhập bằng Google!" 
      });
    } catch (error: any) {
      console.error('Google login error:', error);
      
      // Check if it's a CSP or popup blocked error
      if (error.code === 'auth/internal-error' && 
          error.message?.includes('Content Security Policy')) {
        toast({
          variant: "destructive", 
          title: "❌ Popup bị chặn",
          description: "Trình duyệt chặn popup Google. Vui lòng thử phương pháp khác trong phần Debug.",
        });
      } else {
        const errorMessage = error.message || "Đã xảy ra lỗi không xác định.";
        toast({
          variant: "destructive",
          title: "❌ Đăng nhập Google thất bại",
          description: errorMessage,
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isLogin ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}</CardTitle>
          <CardDescription>
            {isLogin ? "Vui lòng nhập thông tin để đăng nhập." : "Nhập thông tin để bắt đầu sử dụng."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {!isLogin && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ và tên</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyễn Văn A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!isLogin && (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số điện thoại</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="0912345678" 
                          {...field} 
                          maxLength={10}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            target.value = target.value.replace(/[^0-9]/g, '');
                            field.onChange(target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="ban@vidu.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                    {isLogin && (
                      <div className="text-right mt-1">
                        <Link 
                          href="/forgot-password" 
                          className="text-xs text-primary hover:underline"
                        >
                          Quên mật khẩu?
                        </Link>
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
              </Button>
            </form>
          </Form>

          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              HOẶC
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Đăng nhập bằng Google
          </Button>
          <div className="mt-4 text-center text-sm">
            {isLogin ? (
              <>
                Chưa có tài khoản?{" "}
                <Link href="/register" className="underline">
                  Đăng ký
                </Link>
              </>
            ) : (
              <>
                Đã có tài khoản?{" "}
                <Link href="/login" className="underline">
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2FA Verification Dialog */}
      <Verify2FADialog
        open={show2FADialog}
        onOpenChange={setShow2FADialog}
        userId={pendingUserId}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
      />
    </div>
  );
}
