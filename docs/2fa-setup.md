# Two-Factor Authentication (2FA) Setup Guide

## Overview

LibraryCompass supports Two-Factor Authentication (2FA) using Time-based One-Time Password (TOTP) to provide an additional layer of security for user accounts.

## Features

- **TOTP-based authentication**: Compatible with popular authenticator apps
- **Optional security**: Users can enable/disable 2FA as needed
- **QR Code setup**: Easy enrollment via QR code scanning
- **Manual entry**: Alternative setup using secret key
- **User-friendly dialogs**: Step-by-step setup and verification process

## Technical Stack

- **speakeasy**: TOTP token generation and verification
- **qrcode**: QR code generation for authenticator app enrollment
- **Firebase Firestore**: Store 2FA configuration in user documents

## User Flow

### 1. Enable 2FA

1. Navigate to **Settings** page (`/settings`)
2. Click **"Enable 2FA"** button
3. Click **"Generate QR Code"**
4. Scan the QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
5. Enter the 6-digit verification code from your app
6. Click **"Verify & Enable"**
7. 2FA is now active on your account

### 2. Login with 2FA

1. Enter your email and password as usual
2. If 2FA is enabled, a verification dialog will appear
3. Open your authenticator app and get the current 6-digit code
4. Enter the code in the verification dialog
5. Click **"Verify"** to complete login

### 3. Disable 2FA

1. Go to **Settings** page
2. Click **"Disable 2FA"** button
3. Enter a verification code from your authenticator app to confirm
4. Click **"Disable 2FA"**
5. 2FA is now disabled on your account

## API Endpoints

### POST /api/2fa/setup

Generate a new TOTP secret and QR code for 2FA enrollment.

**Request:**
```json
{
  "userId": "user-firebase-uid"
}
```

**Response:**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "otpauthUrl": "otpauth://totp/LibraryCompass..."
}
```

### PATCH /api/2fa/setup

Verify TOTP token and enable 2FA for the user.

**Request:**
```json
{
  "userId": "user-firebase-uid",
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA has been successfully enabled"
}
```

### DELETE /api/2fa/setup

Disable 2FA after verifying current token.

**Query Parameters:**
- `userId`: User's Firebase UID
- `token`: Current 6-digit TOTP code

**Response:**
```json
{
  "success": true,
  "message": "2FA has been successfully disabled"
}
```

### POST /api/2fa/verify

Verify TOTP token during login.

**Request:**
```json
{
  "userId": "user-firebase-uid",
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "message": "2FA verification successful"
}
```

## Components

### Setup2FADialog

Modal dialog for 2FA enrollment process.

**Props:**
- `open`: boolean - Dialog visibility
- `onOpenChange`: (open: boolean) => void - Dialog state handler
- `userId`: string - User's Firebase UID
- `onSuccess`: () => void - Callback after successful setup

**Features:**
- Two-step process: Generate QR → Verify token
- QR code display with base64 image
- Manual secret key entry with copy button
- 6-digit verification code input

### Verify2FADialog

Modal dialog for 2FA verification during login.

**Props:**
- `open`: boolean - Dialog visibility
- `onOpenChange`: (open: boolean) => void - Dialog state handler
- `userId`: string - User's Firebase UID
- `onSuccess`: () => void - Callback after successful verification
- `onCancel`: () => void - Callback when user cancels

**Features:**
- Simple 6-digit code input
- Auto-focus for quick entry
- Enter key support
- Clear error messages

### TwoFactorSettings

Settings panel for managing 2FA configuration.

**Props:**
- `userId`: string - User's Firebase UID
- `isEnabled`: boolean - Current 2FA status
- `onUpdate`: () => void - Callback to refresh user data

**Features:**
- Status badge (Enabled/Disabled)
- Enable/Disable buttons
- Benefits list
- Confirmation dialog for disable action

## Database Schema

### User Document (Firestore)

```typescript
interface Reader {
  // ... existing fields
  twoFactorEnabled?: boolean;   // Whether 2FA is enabled
  twoFactorSecret?: string;      // TOTP secret (base32 encoded)
}
```

**Fields:**
- `twoFactorEnabled`: Flag indicating if 2FA is active
- `twoFactorSecret`: TOTP secret key (should be encrypted in production)

## Security Considerations

### Current Implementation

- Secrets are stored in plaintext in Firestore (base32 encoded)
- Token verification allows 2-step window (±60 seconds)
- No rate limiting on verification attempts

### Recommended Production Enhancements

1. **Encrypt TOTP Secrets**: Use Firebase Functions or a server-side encryption service
   ```typescript
   import crypto from 'crypto';
   
   const algorithm = 'aes-256-gcm';
   const key = process.env.ENCRYPTION_KEY; // 32 bytes
   
   function encrypt(text: string): string {
     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipheriv(algorithm, key, iv);
     let encrypted = cipher.update(text, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     const authTag = cipher.getAuthTag();
     return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
   }
   ```

2. **Add Rate Limiting**: Prevent brute-force attacks
   - Limit verification attempts per user (e.g., 5 attempts per 15 minutes)
   - Use Firestore to track failed attempts
   - Implement exponential backoff

3. **Backup Codes**: Generate single-use recovery codes
   ```typescript
   function generateBackupCodes(count = 8): string[] {
     return Array.from({ length: count }, () => 
       crypto.randomBytes(4).toString('hex').toUpperCase()
     );
   }
   ```

4. **Audit Logging**: Track 2FA events
   - Enable/disable events
   - Failed verification attempts
   - Successful logins with 2FA

5. **Session Management**: Implement "remember this device" feature
   - Store device fingerprint
   - Skip 2FA for trusted devices (30 days)

## Supported Authenticator Apps

LibraryCompass 2FA is compatible with any TOTP-based authenticator app:

- **Google Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **Microsoft Authenticator** (iOS/Android)
- **1Password** (iOS/Android/Desktop)
- **LastPass Authenticator** (iOS/Android)
- **FreeOTP** (iOS/Android)

## Troubleshooting

### QR Code Not Scanning

- Ensure your screen brightness is turned up
- Try the manual secret key entry instead
- Make sure your camera has permission

### Invalid Verification Code

- Check your device's time synchronization (TOTP is time-sensitive)
- Wait for a new code (codes refresh every 30 seconds)
- Ensure no typos in the 6-digit code

### Lost Access to Authenticator App

**Current Solution:**
- Contact an administrator to manually disable 2FA in Firestore

**Recommended Production Solution:**
- Implement backup codes during setup
- Add account recovery flow via email verification

### Time Sync Issues

TOTP requires accurate time synchronization. If codes aren't working:

**iOS:**
- Settings → General → Date & Time → Set Automatically

**Android:**
- Settings → System → Date & time → Use network-provided time

## Testing

### Manual Testing Steps

1. **Test Setup Flow:**
   ```
   Login → Settings → Enable 2FA → Scan QR → Verify Code → Success
   ```

2. **Test Login Flow:**
   ```
   Logout → Login with credentials → Enter 2FA code → Access granted
   ```

3. **Test Disable Flow:**
   ```
   Settings → Disable 2FA → Enter code → Confirm → Success
   ```

4. **Test Error Cases:**
   - Wrong verification code
   - Expired code (wait 30+ seconds)
   - Cancel during setup
   - Cancel during login verification

### API Testing

```bash
# Generate 2FA secret
curl -X POST http://localhost:3000/api/2fa/setup \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id"}'

# Verify and enable
curl -X PATCH http://localhost:3000/api/2fa/setup \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id", "token": "123456"}'

# Verify during login
curl -X POST http://localhost:3000/api/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id", "token": "123456"}'

# Disable 2FA
curl -X DELETE "http://localhost:3000/api/2fa/setup?userId=your-user-id&token=123456"
```

## Environment Variables

No additional environment variables required. 2FA uses the existing Firebase configuration.

## Dependencies

```json
{
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.3",
  "@types/speakeasy": "^2.0.10",
  "@types/qrcode": "^1.5.5"
}
```

## Future Enhancements

- [ ] Backup recovery codes
- [ ] Device trust/remember me feature
- [ ] SMS-based 2FA as alternative
- [ ] Email-based 2FA as alternative
- [ ] Audit log for security events
- [ ] Admin panel to view users with 2FA enabled
- [ ] Enforce 2FA for admin accounts (mandatory)
- [ ] Secret encryption at rest
- [ ] Rate limiting on verification attempts

## References

- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [Speakeasy Documentation](https://github.com/speakeasyjs/speakeasy)
- [QRCode Documentation](https://github.com/soldair/node-qrcode)
- [Google Authenticator](https://support.google.com/accounts/answer/1066447)
