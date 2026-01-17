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

  // Check if user needs to select role (new OAuth users)
  if (needsRoleSelection) {
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

  // Default redirect if role is not set
  redirect("/auth/select-role");
}
