import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const userRole = (session.user as any)?.role;
  const needsRoleSelection = (session.user as any)?.needsRoleSelection;

  // Check if user needs to select role (role is null or needsRoleSelection flag is set)
  if (needsRoleSelection || !userRole) {
    redirect("/auth/select-role");
  }

  // Redirect to role-specific dashboard
  if (userRole === "OWNER") {
    redirect("/dashboard/owner");
  } else if (userRole === "RECEPTIONIST") {
    redirect("/dashboard/receptionist");
  } else if (userRole === "ADMIN") {
    redirect("/dashboard/admin");
  }

  // Fallback - should not reach here
  redirect("/auth/select-role");
}
