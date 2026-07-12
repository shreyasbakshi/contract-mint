import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Contract Mint",
  description:
    "Generate supplier contracts and get renewal intelligence — for small Indian merchants.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="topbar">
            <div className="topbar-inner">
              <Link href="/" className="brand" style={{ color: "var(--text)" }}>
                Contract<span>Mint</span>
              </Link>
              <span className="tag">Supplier contracts · India · assistive, not legal advice</span>
              <div className="auth-actions">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="btn ghost">Sign in</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="btn">Sign up</button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </div>
          </header>
          <main className="container">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
