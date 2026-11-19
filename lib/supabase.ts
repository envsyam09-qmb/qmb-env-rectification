import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function uploadPhotoToSupabase(
  photoSrc: string,
  folder: string
): Promise<string> {
  if (!photoSrc || !photoSrc.startsWith("data:image/") || !supabase) {
    return photoSrc;
  }

  const res = await fetch(photoSrc);
  const blob = await res.blob();
  const fileName = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)}.jpg`;

  const { error } = await supabase.storage
    .from("qmb-photos")
    .upload(fileName, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("qmb-photos")
    .getPublicUrl(fileName);
  return data.publicUrl;
}