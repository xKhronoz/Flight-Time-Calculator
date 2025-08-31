"use client"

import React from "react";
import { ModeToggle } from "./ModeToggle";

export default function Header() {
  return (
    <header className="w-full bg-gray-900 text-white py-4 px-8 flex items-center justify-between shadow">
      <h1 className="text-2xl font-bold">Flight Time Calculator</h1>
      <ModeToggle />
    </header>
  );
}