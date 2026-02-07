"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  User, 
  Mail, 
  Shield, 
  Building2, 
  LogOut, 
  CalendarDays,
  AlertCircle,
  Edit,
  Save,
  X,
  Lock,
  Phone as PhoneIcon,
  ArrowLeft
} from "lucide-react";

interface AssignedProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: "OWNER" | "RECEPTIONIST";
  image: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  assignedProperty: AssignedProperty | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/api/auth/signin");
    }

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/user/profile");
      
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data.user);
      setEditName(data.user.name || "");
      setEditPhone(data.user.phone || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditName(profile?.name || "");
    setEditPhone(profile?.phone || "");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(profile?.name || "");
    setEditPhone(profile?.phone || "");
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName.trim() || null,
          phone: editPhone.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const data = await response.json();
      setProfile(data.user);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setPasswordError(null);
      setPasswordSuccess(false);

      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError("All fields are required");
        return;
      }

      if (newPassword.length < 8) {
        setPasswordError("New password must be at least 8 characters");
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError("New passwords do not match");
        return;
      }

      setChangingPassword(true);

      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === "OWNER" ? "default" : "secondary";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-white/50 dark:bg-slate-900/50">
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Error Loading Profile
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={fetchProfile} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-white/50 dark:hover:bg-slate-800/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        {/* Profile Header Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-900 dark:to-purple-900 border-0 shadow-2xl">
          <CardContent className="pt-6 pb-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-xl ring-4 ring-white/20">
                  {profile.image ? (
                    <img src={profile.image} alt={profile.name || "Profile"} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-white dark:border-slate-800 shadow-lg"></div>
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {profile.name || "Welcome"}
                </h1>
                <p className="text-blue-100 dark:text-blue-200 mb-3">
                  {profile.email}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Badge 
                    variant="secondary"
                    className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
                  >
                    {profile.role}
                  </Badge>
                  {profile.emailVerified && (
                    <Badge 
                      variant="secondary"
                      className="bg-green-500/20 text-white border-green-300/30 backdrop-blur-sm"
                    >
                      ✓ Verified
                    </Badge>
                  )}
                </div>
              </div>
              
              {!isEditing && (
                <Button
                  onClick={handleEditClick}
                  variant="secondary"
                  size="lg"
                  className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receptionist Warning */}
        {profile.role === "RECEPTIONIST" && !profile.assignedProperty && (
          <Card className="border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-yellow-500/20">
                  <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    Property Assignment Required
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    You need to be assigned to a property by your manager to access the system features. Please contact your administrator for assistance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Information Card */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <User className="h-4 w-4" />
                    Full Name
                  </div>
                  {isEditing ? (
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter your name"
                      className="text-base font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                    />
                  ) : (
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {profile.name || "Not provided"}
                    </p>
                  )}
                </div>

                <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </div>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 break-all">
                    {profile.email}
                  </p>
                </div>

                <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <PhoneIcon className="h-4 w-4" />
                    Phone Number
                  </div>
                  {isEditing ? (
                    <Input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="text-base font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                    />
                  ) : (
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {profile.phone || "Not provided"}
                    </p>
                  )}
                </div>
              </div>
              
              {isEditing && (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="gap-2 flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    disabled={saving}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Details Card */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <Shield className="h-4 w-4" />
                  User ID
                </div>
                <p className="text-xs font-mono text-slate-900 dark:text-slate-100 break-all bg-slate-200 dark:bg-slate-800 p-2 rounded">
                  {profile.id}
                </p>
              </div>

              {profile.role === "RECEPTIONIST" && (
                <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Building2 className="h-4 w-4" />
                    Property Assignment
                  </div>
                  {profile.assignedProperty ? (
                    <div className="space-y-2">
                      <Badge variant="default" className="bg-green-600">
                        ✓ Assigned
                      </Badge>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {profile.assignedProperty.name}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {profile.assignedProperty.address}<br/>
                        {profile.assignedProperty.city}, {profile.assignedProperty.state}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Not Assigned
                      </Badge>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Contact your manager for property assignment
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <CalendarDays className="h-4 w-4" />
                  Account Created
                </div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {formatDate(profile.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Card */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  Security Settings
                </CardTitle>
                <CardDescription className="mt-2">
                  Manage your password and security preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!showPasswordChange ? (
              <Button
                onClick={() => setShowPasswordChange(true)}
                variant="outline"
                size="lg"
                className="gap-2 w-full sm:w-auto border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Lock className="h-4 w-4" />
                Change Password
              </Button>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    className="border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {passwordError && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">{passwordError}</p>
                    </div>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                      <div className="p-1 rounded-full bg-green-600">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Password changed successfully!
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    className="gap-2 flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Lock className="h-4 w-4" />
                    {changingPassword ? "Changing..." : "Change Password"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPasswordChange(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setPasswordError(null);
                    }}
                    variant="outline"
                    disabled={changingPassword}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-xl">Quick Actions</CardTitle>
            <CardDescription>
              Manage your session and refresh your data
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={fetchProfile} 
                variant="outline"
                size="lg"
                className="gap-2 flex-1 min-w-[140px] border-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
              <Button 
                onClick={handleSignOut} 
                variant="destructive"
                size="lg"
                className="gap-2 flex-1 min-w-[140px]"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
