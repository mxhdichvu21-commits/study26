import { createClient } from "@/lib/supabase/server";

export default async function TestSupabasePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Study26 - Supabase Test</h1>

      {error ? (
        <>
          <h2>Kết nối Supabase đã chạy</h2>
          <p>
            Database chưa có bảng <b>profiles</b> hoặc chưa cấu hình schema.
          </p>
          <pre>{error.message}</pre>
        </>
      ) : (
        <>
          <h2>✅ Supabase kết nối thành công</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </main>
  );
}
