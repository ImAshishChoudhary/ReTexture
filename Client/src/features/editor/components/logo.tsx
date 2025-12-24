import Link from "next/link";

export const Logo = () => {
  return (
    <Link href="/">
      <div className="flex items-center gap-2 shrink-0 hover:opacity-75 transition">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#171717"/>
          <path d="M7 8h10M7 12h10M7 16h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="text-[13px] font-semibold text-neutral-900">ReTexture</span>
      </div>
    </Link>
  );
};
