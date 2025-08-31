"use client"

import React from "react";
import { ModeToggle } from "./ModeToggle";

export default function Header() {
  return (
    <header className="w-full dark:bg-gray-900 dark:text-white py-4 px-8 flex items-center justify-between shadow">
      <a href="/" className="text-2xl font-bold hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-400">
        Flight Time Calculator
      </a>
      <ModeToggle />
    </header>
  );
}