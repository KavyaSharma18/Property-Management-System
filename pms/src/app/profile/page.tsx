import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <CardTitle className="text-3xl mb-2">Profile</CardTitle>
            <p className="text-muted-foreground mb-6">Manage your account details</p>

            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Name</span>
                <p className="text-lg font-medium">Demo User</p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Email</span>
                <p className="text-lg font-medium">demo@sentinelpms.com</p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Role</span>
                <p className="text-lg font-medium">Owner / Receptionist</p>
              </div>
            </div>

            <div className="mt-8">
              <Button disabled variant="default">
                Edit Profile (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
