'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Setup2FADialog } from './setup-2fa-dialog';

interface TwoFactorSettingsProps {
  userId: string;
  isEnabled: boolean;
  onUpdate: () => void;
}

export function TwoFactorSettings({
  userId,
  isEnabled,
  onUpdate,
}: TwoFactorSettingsProps) {
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDisable2FA = async () => {
    if (!disableCode || disableCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/2fa/setup?userId=${userId}&token=${disableCode}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled',
      });

      setShowDisableDialog(false);
      setDisableCode('');
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Disable Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            {isEnabled ? (
              <Badge variant="default" className="bg-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">
                <ShieldOff className="h-3 w-3 mr-1" />
                Disabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              {isEnabled ? (
                <>
                  Two-factor authentication is <strong>enabled</strong> for your account. You
                  will need to enter a verification code from your authenticator app when
                  logging in.
                </>
              ) : (
                <>
                  Two-factor authentication adds an extra layer of security by requiring a
                  verification code from your phone in addition to your password.
                </>
              )}
            </AlertDescription>
          </Alert>

          {isEnabled ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                If you want to disable 2FA, you&apos;ll need to verify your identity with a
                verification code from your authenticator app.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Benefits of 2FA:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Protects your account even if your password is compromised</li>
                  <li>Prevents unauthorized access to your personal information</li>
                  <li>Works with popular authenticator apps like Google Authenticator</li>
                </ul>
              </div>
              <Button onClick={() => setShowSetupDialog(true)}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Enable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Setup2FADialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        userId={userId}
        onSuccess={onUpdate}
      />

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your account less secure. To confirm, please enter a
              verification code from your authenticator app.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="disable-code">Verification Code</Label>
            <Input
              id="disable-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDisableCode('');
                setShowDisableDialog(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              disabled={loading || disableCode.length !== 6}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable 2FA'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
