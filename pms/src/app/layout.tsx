import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
