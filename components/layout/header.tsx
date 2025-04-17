import React from "react";

const Header = () => {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Sticky header */}
      <div className="flex items-center gap-4">
        {/* Placeholder for mobile nav toggle or logo */}
        <span className="font-semibold">Trackure</span>
      </div>
      <div>
        {/* Placeholder for user menu/actions */}
        User Menu
      </div>
    </header>
  );
};

export default Header;
