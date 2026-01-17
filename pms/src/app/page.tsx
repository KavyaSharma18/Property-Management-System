import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    const userRole = (session.user as any).role;
    
    // Redirect to appropriate dashboard based on role
    if (userRole === "OWNER") {
      redirect("/dashboard/owner");
    } else if (userRole === "RECEPTIONIST") {
      redirect("/dashboard/receptionist");
    } else if (userRole === "ADMIN") {
      redirect("/dashboard/admin");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg">
        <Card>
          <CardContent className="p-8 space-y-8">
            <div className="text-center space-y-4">
              <CardTitle className="text-4xl">Property Management System</CardTitle>
              <p className="text-lg text-muted-foreground">Manage your properties, tenants, and leases all in one place</p>
            </div>

            <div className="space-y-4">
              <Button asChild className="w-full h-12 text-base" size="lg">
                <Link href="/auth/signup">Create New Account</Link>
              </Button>
              <Button asChild variant="outline" className="w-full h-12 text-base" size="lg">
                <Link href="/auth/signin">Sign In to Existing Account</Link>
              </Button>
            </div>

            <div className="pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center mb-4">Why choose our system?</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Easy property tracking
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Tenant management
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Lease agreement tracking
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
