import type { Metadata } from "next";
import "./globals.css";
import NextAuthProvider from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "Property Management System",
  description: "Manage properties, tenants, and leases from one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
