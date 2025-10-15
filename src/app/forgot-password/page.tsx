"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setIsLoading(true);
    try {
      await resetPassword(values.email);
      setEmailSent(true);
      toast({
        title: "✅ Email đã được gửi",
        description: "Vui lòng kiểm tra hộp thư của bạn để đặt lại mật khẩu.",
        duration: 6000,
      });
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = (error as { code?: string })?.code?.replace('auth/', '').replace(/-/g, ' ') || "Đã xảy ra lỗi không xác định.";
      toast({
        variant: "destructive",
        title: "❌ Không thể gửi email",
        description: errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1) + '.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold">Quên mật khẩu</CardTitle>
          <CardDescription>
            {emailSent
              ? "Email đã được gửi! Kiểm tra hộp thư của bạn."
              : "Nhập email để nhận link đặt lại mật khẩu"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Mail className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Email đặt lại mật khẩu đã được gửi
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Vui lòng kiểm tra hộp thư <strong>{form.getValues("email")}</strong> và click vào link để đặt lại mật khẩu.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>💡 <strong>Lưu ý:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Kiểm tra cả thư mục spam nếu không thấy email</li>
                  <li>Link đặt lại mật khẩu có hiệu lực trong 1 giờ</li>
                  <li>Sau khi đặt lại, bạn có thể đăng nhập với mật khẩu mới</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEmailSent(false);
                    form.reset();
                  }}
                >
                  Gửi lại email
                </Button>
                <Link href="/login" className="flex-1">
                  <Button className="w-full">Về trang đăng nhập</Button>
                </Link>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@example.com"
                          type="email"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Đang gửi..." : "Gửi email đặt lại mật khẩu"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
