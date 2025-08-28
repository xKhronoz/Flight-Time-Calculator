export const metadata = {
  title: "Flight Time Calculator",
  description: "DST-aware, multi-leg flight time calculator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
