"use client"

import React from "react";
import { ModeToggle } from "./ModeToggle";
import logo from '@/public/logo.png';
import Image from "next/image";

export default function Header() {
  return (
    <header className="w-full dark:bg-gray-900 dark:text-white py-4 px-8 flex items-center justify-between shadow">
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 text-2xl font-bold hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-400">
          <Image
            className="rounded-full"
            src={logo}
            alt="Logo"
            width={48}
            height={48}
            priority
          />
          <span>Flight Time Calculator</span>
        </a>
      </div>
      <ModeToggle />
    </header>
  );
}