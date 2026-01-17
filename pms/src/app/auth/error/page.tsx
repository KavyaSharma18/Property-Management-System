import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Authentication Error | Property Management System",
  description: "An error occurred during authentication",
};

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  let errorMessage = "An unexpected error occurred. Please try again.";
  
  if (error === "OAuthSignin") {
    errorMessage = "Error constructing authorization URL.";
  } else if (error === "OAuthCallback") {
    errorMessage = "Error handling OAuth callback.";
  } else if (error === "OAuthCreateAccount") {
    errorMessage = "Could not create OAuth provider user in database.";
  } else if (error === "EmailCreateAccount") {
    errorMessage = "Could not create email provider user in database.";
  } else if (error === "Callback") {
    errorMessage = "Error in callback handler.";
  } else if (error === "OAuthAccountNotLinked") {
    errorMessage = "Email already associated with another account.";
  } else if (error === "EmailSignin") {
    errorMessage = "Check your email address.";
  } else if (error === "CredentialsSignin") {
    errorMessage = "Invalid credentials. Please check your email and password.";
  } else if (error === "SessionRequired") {
    errorMessage = "Please sign in to access this page.";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-8 space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Authentication Error</h1>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/auth/signin">Try Again</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/signup">Create New Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
