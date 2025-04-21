import React from "react";
import Image from "next/image";
import Link from "next/link";

const Header = () => {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border bg-black px-4 md:px-6">
      {/* Sticky header */}
      <div className="flex items-center gap-4">
        {/* Placeholder for mobile nav toggle or logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Trackure Logo" width={24} height={24} />
          <span className="font-semibold text-xl">Trackure</span>
        </Link>
      </div>
      <div>
        {/* Placeholder for user menu/actions */}
        User Menu
      </div>
    </header>
  );
};

export default Header;
