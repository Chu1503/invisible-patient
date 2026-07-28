import type { Metadata } from "next";
import AccountDataGate from "@/components/AccountDataGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Invisible Patient",
  description: "A mental health support system for dementia and brain injury caregivers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9FAF7]">
        <AccountDataGate>{children}</AccountDataGate>
      </body>
    </html>
  );
}
