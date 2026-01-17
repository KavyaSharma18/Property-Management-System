import { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/signup-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign Up | Property Management System",
  description: "Create a new account",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <CardTitle className="text-3xl">Create Account</CardTitle>
              <p className="text-muted-foreground">Get started with Property Management System</p>
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

            <SignUpForm />

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/auth/signin" className="font-medium text-primary hover:underline">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
