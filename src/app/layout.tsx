import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "OptiSchedule — AI Powered Academic Timetable Generator",
  description:
    "Generate conflict-free academic timetables with AI-powered scheduling. Built for universities and colleges.",
  keywords: ["timetable", "scheduler", "academic", "AI", "OptiSchedule"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "rgba(15, 23, 42, 0.9)",
              backdropFilter: "blur(16px)",
              color: "#f1f5f9",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "12px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
            },
            success: {
              iconTheme: {
                primary: "#22c55e",
                secondary: "#f1f5f9",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#f1f5f9",
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
