"use client";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) router.push("/login");

      const { data, error } = await supabase.from("tracks").select("*").order("created_at", { ascending: false });
      if (!error && data) setTracks(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading)
    return (
      <main className="flex items-center justify-center min-h-screen bg-[#fdfbf8]">
        <p>Loading...</p>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#fdfbf8] text-gray-900 p-8">
      <h1 className="text-3xl font-semibold mb-6">Your Uploaded Tracks</h1>
      {tracks.length === 0 ? (
        <p>No tracks uploaded yet.</p>
      ) : (
        <ul className="space-y-4">
          {tracks.map((t) => (
            <li key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <p className="font-medium">{t.title}</p>
              <a
                href={t.storage_url}
                target="_blank"
                className="text-sm text-yellow-700 hover:underline"
              >
                View File
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
