import React from "react";

const Sidebar = () => {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-background p-4 md:flex">
      {/* Fixed width, hidden on mobile (md:flex) */}
      <h2 className="text-lg font-semibold">Sidebar</h2>
      {/* Placeholder content */}
      <nav className="mt-4">Navigation links go here</nav>
    </aside>
  );
};

export default Sidebar;
