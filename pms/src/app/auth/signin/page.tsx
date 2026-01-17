import { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth/signin-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign In | Property Management System",
  description: "Sign in to your account",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <CardTitle className="text-3xl">Welcome Back</CardTitle>
              <p className="text-muted-foreground">Sign in to your Property Management System account</p>
            </div>

            <OAuthButtons />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <SignInForm />

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/auth/signup" className="font-medium text-primary hover:underline">Sign up</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
