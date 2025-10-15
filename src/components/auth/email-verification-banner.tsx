"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function EmailVerificationBanner() {
  const [show, setShow] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkVerification = async () => {
      const user = auth.currentUser;
      if (!user || user.emailVerified) {
        setShow(false);
        return;
      }

      // Check if user is reader (only readers need email verification)
      if (db) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        if (userData?.role === 'admin' || userData?.role === 'librarian') {
          setShow(false);
          return;
        }
      }

      // Show banner only for unverified readers
      setShow(true);
    };

    // Check initially
    checkVerification();

    // Check periodically (every 3 seconds)
    const interval = setInterval(checkVerification, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleResendEmail = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsResending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "✅ Email đã được gửi lại",
        description: "Vui lòng kiểm tra hộp thư của bạn.",
        duration: 5000,
      });
    } catch (error: unknown) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "❌ Không thể gửi email",
        description: "Vui lòng thử lại sau.",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!show) return null;

  return (
    <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 mb-6 relative">
      <Mail className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Email chưa được xác thực.</strong> Vui lòng kiểm tra hộp thư và click vào link xác thực. 
            Trang sẽ tự động cập nhật sau khi bạn xác thực.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendEmail}
            disabled={isResending}
            className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-950"
          >
            {isResending ? "Đang gửi..." : "Gửi lại email"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShow(false)}
            className="text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
