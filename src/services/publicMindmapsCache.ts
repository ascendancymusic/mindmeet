import { supabase } from "../supabaseClient"

let cachedMindmaps: Array<{ title: string; json_data: any }> = []
let isFetched = false

export async function getPublicMindmaps(): Promise<Array<{ title: string; json_data: any }>> {
  if (isFetched && cachedMindmaps.length > 0) {
    return cachedMindmaps
  }
  const { data, error } = await supabase
    .from("mindmaps")
    .select("title, json_data")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(10)
  if (!error && data) {
    cachedMindmaps = data
    isFetched = true
  }
  return cachedMindmaps
}

export function clearPublicMindmapsCache() {
  isFetched = false
  cachedMindmaps = []
}
