import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth()
  const token = (session as any)?.accessToken as string | undefined
  if (!token) return new Response("Unauthorized", { status: 401 })
  const { searchParams } = new URL(req.url)
  const name = searchParams.get("name")
  if (name) {
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!userRes.ok) return new Response(await userRes.text(), { status: userRes.status })
    const user = await userRes.json()
    const res = await fetch(`https://api.github.com/repos/${user.login}/${name}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 404) return new Response(JSON.stringify({ exists: false }), { status: 404, headers: { "Content-Type": "application/json" } })
    return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } })
  }
  const res = await fetch("https://api.github.com/user/repos?per_page=100", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } })
}
