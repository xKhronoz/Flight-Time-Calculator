export const metadata = {
  title: "Sitemap",
  description: "Human-readable sitemap for Flight Time Calculator",
};

const pages = [
  { path: "/", title: "Home" },
  { path: "/privacy", title: "Privacy" },
  { path: "/sitemap", title: "Sitemap" },
];

export default function SitemapPage() {
  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Sitemap</h1>
      <p className="mb-4">Links to the important pages on this site.</p>
      <ul className="list-disc ml-6 space-y-2">
        {pages.map((p) => (
          <li key={p.path}>
            <a href={p.path} className="text-sky-500 hover:underline">
              {p.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
