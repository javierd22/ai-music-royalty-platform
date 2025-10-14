import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">AI Music Royalty Platform</h1>
      <p className="text-gray-700">
        Fingerprint songs, verify influence with an auditor, and pay artists fairly when AI uses their work.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/upload" className="rounded-lg border p-4 hover:bg-gray-50">
          <div className="text-lg font-medium">Upload</div>
          <div className="text-sm text-gray-600">Add an audio file and run a demo check.</div>
        </Link>

        <Link href="/result" className="rounded-lg border p-4 hover:bg-gray-50">
          <div className="text-lg font-medium">Result</div>
          <div className="text-sm text-gray-600">See mock matches and influence split.</div>
        </Link>

        <Link href="/dashboard" className="rounded-lg border p-4 hover:bg-gray-50">
          <div className="text-lg font-medium">Dashboard</div>
          <div className="text-sm text-gray-600">View lifetime totals and recent events.</div>
        </Link>
      </div>

      <p className="text-sm text-gray-500">
        This is a demo. Data is stored locally in your browser for now.
      </p>
    </section>
  );
}
