import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * POST /api/2fa/verify - Verify 2FA token during login
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'userId and token are required' },
        { status: 400 }
      );
    }

    // Get user data
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    if (!userData.twoFactorEnabled || !userData.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA chưa được bật cho tài khoản này' },
        { status: 400 }
      );
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: userData.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps before/after (60 seconds each)
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Mã xác thực không hợp lệ hoặc đã hết hạn' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Xác thực 2FA thành công',
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: 'Không thể xác thực token 2FA', details: error },
      { status: 500 }
    );
  }
}
