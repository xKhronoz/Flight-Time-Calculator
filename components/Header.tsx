"use client"

import React from "react";
import { ModeToggle } from "./ModeToggle";

export default function Header() {
  return (
    <header className="w-full dark:bg-gray-900 dark:text-white py-4 px-8 flex items-center justify-between shadow">
      <div className="flex items-center text-center gap-3">
        <a href="/" className="text-2xl font-bold hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-400">
          <img src="/Logo.png" alt="Logo" className="h-12 w-12 mb-1 mr-2 inline-block align-middle" />
          <span>Flight Time Calculator</span>
        </a>
      </div>
      <ModeToggle />
    </header>
  );
}