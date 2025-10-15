"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteUserChecklistProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userEmail: string;
  onConfirm: () => void;
}

export function DeleteUserChecklist({
  open,
  onOpenChange,
  userName,
  userEmail,
  onConfirm,
}: DeleteUserChecklistProps) {
  const [step1, setStep1] = useState(false);
  const [step2, setStep2] = useState(false);
  const [step3, setStep3] = useState(false);

  const allChecked = step1 && step2 && step3;

  const handleConfirm = () => {
    onConfirm();
    // Reset checkboxes
    setStep1(false);
    setStep2(false);
    setStep3(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset checkboxes
    setStep1(false);
    setStep2(false);
    setStep3(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            Xác nhận xóa tài khoản
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            <div className="space-y-1 mb-4">
              <p className="font-semibold text-foreground">Thông tin người dùng:</p>
              <p><span className="font-medium">Tên:</span> {userName}</p>
              <p><span className="font-medium">Email:</span> {userEmail}</p>
            </div>
            <p className="text-destructive font-medium">
              ⚠️ Hành động này không thể hoàn tác!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 my-6">
          <p className="font-semibold text-foreground">
            Checklist xóa tài khoản (2 bước):
          </p>

          {/* Step 1 */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50">
            <Checkbox
              id="step1"
              checked={step1}
              onCheckedChange={(checked) => setStep1(checked as boolean)}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <label
                htmlFor="step1"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                {step1 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                Bước 1: Xóa khỏi Firestore Database
              </label>
              <p className="text-sm text-muted-foreground">
                Bấm nút &quot;Xác nhận xóa&quot; bên dưới để xóa dữ liệu người dùng khỏi Firestore Database.
                Hệ thống sẽ tự động thực hiện bước này.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50">
            <Checkbox
              id="step2"
              checked={step2}
              onCheckedChange={(checked) => setStep2(checked as boolean)}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <label
                htmlFor="step2"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                {step2 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                Bước 2: Xóa khỏi Firebase Authentication
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Sau khi xóa xong bước 1, bạn cần xóa thủ công trong Firebase Console:
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>Mở Firebase Console</li>
                <li>Vào mục <strong>Authentication</strong> → <strong>Users</strong></li>
                <li>Tìm user với email: <strong className="text-foreground">{userEmail}</strong></li>
                <li>Bấm vào menu 3 chấm → <strong>Delete account</strong></li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => window.open("https://console.firebase.google.com/project/_/authentication/users", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Mở Firebase Console
              </Button>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50">
            <Checkbox
              id="step3"
              checked={step3}
              onCheckedChange={(checked) => setStep3(checked as boolean)}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <label
                htmlFor="step3"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                {step3 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                Xác nhận đã hiểu và sẽ thực hiện đầy đủ
              </label>
              <p className="text-sm text-muted-foreground">
                Tôi xác nhận sẽ thực hiện cả 2 bước để xóa hoàn toàn tài khoản người dùng khỏi hệ thống.
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!allChecked}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Xác nhận xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
