import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  const token = (session as any)?.accessToken as string | undefined
  if (!token) return new Response("Unauthorized", { status: 401 })
  const res = await fetch("https://api.github.com/user/repos?per_page=100", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } })
}
