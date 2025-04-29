"use client"; // Need this for hooks like useRouter and useState

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Import useRouter
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client"; // Import Supabase client function

const Header = () => {
  const router = useRouter();
  const supabase = createClient(); // Create Supabase client instance

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error);
        // Handle error (e.g., show a notification)
      } else {
        // Redirect to login page after successful logout
        router.push("/login");
      }
    } catch (err) {
      console.error("Unexpected error during logout:", err);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border bg-black px-4 md:px-6">
      {/* Sticky header */}
      <div className="flex items-center gap-4">
        {/* Placeholder for mobile nav toggle or logo */}
        {/* <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Trackure Logo" width={24} height={24} />
          <span className="font-semibold text-xl">Trackure</span>
        </Link> */}
      </div>
      <div className="flex items-center gap-4">
        {/* New Order Button */}
        <Link href="/orders/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </Link>

        {/* User Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-secondary"
            >
              <User className="h-5 w-5" />
              <span className="sr-only">User Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border">
            {/* Add other menu items here if needed, e.g., Profile */}
            <DropdownMenuItem
              onSelect={handleLogout}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
