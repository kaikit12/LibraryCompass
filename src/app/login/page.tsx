
import { AuthForm } from "@/components/auth/auth-form";
import { LoginDebug } from "@/components/debug/login-debug";
import { FirebaseConnectionTest } from "@/components/debug/firebase-connection-test";
import { GoogleAuthDebug } from "@/components/debug/google-auth-debug";
import { GoogleAuthAlternative } from "@/components/debug/google-auth-alternative";
import { SimpleGoogleAuth } from "@/components/auth/simple-google-auth";
import { GoogleAuthInfo } from "@/components/auth/google-auth-info";

export default function LoginPage() {
    return (
        <div className="space-y-6">
            <AuthForm mode="login" />
            
            {/* Debug components hidden */}
            {process.env.NODE_ENV === 'development' && false && (
                <>
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4 text-center">Alternative Google Auth (Recommended)</h3>
                        <div className="space-y-4">
                            <GoogleAuthInfo />
                            <SimpleGoogleAuth />
                        </div>
                    </div>
                    
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4 text-center">Debug Tools</h3>
                        <div className="space-y-4">
                            <FirebaseConnectionTest />
                            <GoogleAuthAlternative />
                            <GoogleAuthDebug />
                            <LoginDebug />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
