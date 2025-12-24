"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-[18px] font-light text-white tracking-tight">ReTexture</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/templates"
                className={`text-[14px] font-normal transition-colors ${
                  pathname === "/templates" ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Templates
              </Link>
              <Link
                href="/projects"
                className={`text-[14px] font-normal transition-colors ${
                  pathname === "/projects" ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Projects
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-[14px] font-normal text-neutral-400 hover:text-white transition-colors">
              Log In
            </button>
            <button className="h-9 px-5 bg-white text-black text-[14px] font-medium rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2">
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
