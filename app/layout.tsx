import type { Metadata } from "next";
import AccountDataGate from "@/components/AccountDataGate";
import RouteScrollReset from "@/components/RouteScrollReset";
import TaskReminderManager from "@/components/TaskReminderManager";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Invisible Patient",
  description: "A mental health support system for dementia and brain injury caregivers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9FAF7]">
        <RouteScrollReset />
        <AccountDataGate>
          <TaskReminderManager />
          {children}
        </AccountDataGate>
      </body>
    </html>
  );
}
