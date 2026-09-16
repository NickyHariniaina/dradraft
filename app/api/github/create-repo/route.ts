import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  const token = (session as any)?.accessToken as string | undefined
  if (!token) return new Response("Unauthorized", { status: 401 })
  const { name } = await req.json()
  if (!name || !/^[a-zA-Z0-9._-]{1,100}$/.test(name)) {
    return new Response("Invalid repo name", { status: 400 })
  }
  const res = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({ name, private: true, description: "dradraft drawings — private storage", auto_init: true }),
  })
  const text = await res.text()
  if (res.status === 422 && text.includes("already exists")) {
    return new Response(JSON.stringify({ exists: true }), { status: 200, headers: { "Content-Type": "application/json" } })
  }
  return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } })
}
