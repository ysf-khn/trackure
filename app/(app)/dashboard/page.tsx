"use client"; // Make this a client component for time-based greeting

import React, { useState } from "react";
import Link from "next/link"; // Import Link
import { Button } from "@/components/ui/button"; // Import Button
import { QuickStats } from "@/components/dashboard/QuickStats";
import { WorkflowOverview } from "@/components/dashboard/WorkflowOverview";
import { BottleneckList } from "@/components/dashboard/BottleneckList";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"; // Import the new component

// Define the greetings structure
const greetings = {
  morning: [
    "Good Morning. Wishing you a productive day ahead.",
    "Good Morning. Let's get started.",
    "Morning. Ready to begin?",
  ],
  afternoon: [
    "Good Afternoon. Hope your day is going well.",
    "Good Afternoon. Let's continue making progress.",
    "Hello. Wishing you a productive afternoon.",
  ],
  evening: [
    "Good Evening. How's your day going so far?",
    "Good Evening. Let's finish strong.",
    "Evening. How can we help you wrap up your day?",
  ],
  night: [
    "Good Night. Wishing you a restful evening.",
    "Good Night. Take care and rest well.",
    "Good Night. Looking forward to tomorrow.",
  ],
};

// Function to get the greeting based on the time and day
const getGreeting = () => {
  const hour = new Date().getHours();
  const dayOfMonth = new Date().getDate();
  const index = (dayOfMonth - 1) % 3; // Cycle through 0, 1, 2

  let timeSlot: keyof typeof greetings;

  if (hour >= 5 && hour < 12) {
    timeSlot = "morning";
  } else if (hour >= 12 && hour < 17) {
    // Adjusted afternoon end time based on MD file
    timeSlot = "afternoon";
  } else if (hour >= 17 && hour < 20) {
    // Adjusted evening start/end time based on MD file
    timeSlot = "evening";
  } else {
    timeSlot = "night"; // Covers 8 PM to 4:59 AM
  }

  return greetings[timeSlot][index];
};

export default function DashboardPage() {
  // State for the greeting, initialize directly
  const [greeting] = useState(getGreeting());

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header section with Greeting and Create Button */}
      <div className="flex items-center justify-between">
        {/* Use the dynamic greeting */}
        <h1 className="text-2xl font-semibold bg-gradient-to-b from-white to-gray-600 text-transparent bg-clip-text">
          {greeting}
        </h1>
        <Link href="/orders/new">
          <Button>Create New Order</Button>
        </Link>
      </div>

      {/* Let's try a layout: 2 top cards, 2 bottom cards */}
      {/* Revised for Bento: 4 columns total. Top: 2+2. Bottom: 3+1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
        {/* Top Row */}
        <div className="md:col-span-2">
          {" "}
          {/* Spans 2/4 columns */}
          <QuickStats />
        </div>
        <div className="md:col-span-2">
          {" "}
          {/* Spans 2/4 columns */}
          <WorkflowOverview />
        </div>

        {/* Bottom Row */}
        <div className="md:col-span-3">
          {" "}
          {/* Spans 3/4 columns */}
          <BottleneckList />
        </div>
        <div className="md:col-span-1">
          {" "}
          {/* Spans 1/4 columns */}
          {/* <ActivityFeed /> */}
        </div>
      </div>
    </div>
  );
}
