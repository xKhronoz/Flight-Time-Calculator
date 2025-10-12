export const metadata = {
  title: "Privacy",
  description: "Privacy policy for Flight Time Calculator",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-4">
        This is a minimal privacy notice for the Flight Time Calculator demo
        app.
      </p>
      <section className="mb-4">
        <h2 className="font-semibold">Data collection</h2>
        <p>
          The app does not collect personal data. When you use the
          search/autocomplete we may perform lookups against an internal
          airports database. No third-party trackers are used.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold">Third-party services</h2>
        <p>
          We link to GitHub and other sites; third-party sites are subject to
          their own privacy policies.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">Contact</h2>
        <p>
          If you have privacy questions, contact the project owner on GitHub:{" "}
          <a
            className="text-sky-500 hover:underline"
            href="https://github.com/xKhronoz"
          >
            xKhronoz
          </a>
          .
        </p>
      </section>
    </main>
  );
}
