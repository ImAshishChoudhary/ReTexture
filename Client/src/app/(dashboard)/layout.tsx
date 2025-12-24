"use client";

import { Navbar } from "./navbar";
import { CustomCursor } from "@/components/custom-cursor";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="h-screen bg-black overflow-hidden cursor-none">
      <CustomCursor />
      <Navbar />
      <main className="pt-16 h-full">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
