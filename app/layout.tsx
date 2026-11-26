import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import { RoleProvider } from "@/context/RoleContext";
import { redirect } from "next/navigation";
import { getAuthUserId, getSessionUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bayani Trucking",
  description: "Delivery management system for Bayani Trucking",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  // Signed in, but the login has no access any more (employee marked inactive, or no
  // profile): end the session instead of rendering a half-working page.
  if (!user && (await getAuthUserId())) {
    redirect("/auth/signout?reason=inactive");
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased page-gradient`}
      >
        {user ? (
          <RoleProvider
            user={{
              id: user.id,
              email: user.email,
              role: user.role,
              employeeName: user.employeeName,
              isDriver: user.isDriver,
            }}
          >
            <AppShell>{children}</AppShell>
          </RoleProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
