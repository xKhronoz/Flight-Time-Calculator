import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-gray-900 text-white py-4 px-8 flex items-center justify-center mt-8">
      <span className="text-sm">&copy; {new Date().getFullYear()} Flight Time Calculator. All rights reserved.</span>
    </footer>
  );
}
