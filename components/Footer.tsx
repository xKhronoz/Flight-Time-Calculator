import React from "react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      aria-label="Site footer"
      className="mt-12 border-t border-slate-200 dark:border-slate-700 dark:bg-gray-900"
    >
      <div className="max-w-7xl mx-auto px-4 py-6 md:flex md:items-center md:justify-between">
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <div className="font-medium">Flight Time Calculator</div>
          <div className="mt-1 text-xs opacity-80">
            Calculate flight & transit times across timezones.
          </div>
          <div className="mt-2 text-xs">
            © {year}{" "}
            <a
              href="https://github.com/xKhronoz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-500 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400"
            >
              xKhronoz
            </a>
          </div>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <nav aria-label="Footer links" className="text-sm flex gap-3">
            <a
              href="/privacy"
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400"
            >
              Privacy
            </a>
            <a
              href="/sitemap"
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400"
            >
              Sitemap
            </a>
            <a
              href="https://github.com/xKhronoz/Flight-Time-Calculator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400"
              aria-label="Source on GitHub"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.804 5.624-5.475 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              Source
            </a>
          </nav>

          {/* <div className="flex items-center gap-2">
            <a
              href="https://twitter.com/"
              aria-label="Twitter"
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 22.43 1s-2.6 1.6-4.7 2.2A4.48 4.48 0 0 0 16 0c-2.5 0-4.5 2.3-4 4.8C8 5.6 4.3 3.9 1.5 1.6 0 4 1.7 7 4.8 8.2a4.48 4.48 0 0 1-2-.6v.1C4.8 10.4 7.4 12 10.3 12.4c-1.2.3-2.5.4-3.8.2A4.5 4.5 0 0 0 11 17c-2.7 2-6 3.1-9.6 2.5C3.5 23 7.6 24 12 24c7.5 0 11.6-6.5 11.6-12v-.6A8.5 8.5 0 0 0 23 3z" />
              </svg>
            </a>
          </div> */}
        </div>
      </div>
    </footer>
  );
}
