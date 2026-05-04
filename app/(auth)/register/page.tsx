"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Field, inputClasses } from "@/components/ui/form-section"

export default function RegisterPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน")
      return
    }

    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
      return
    }

    setLoading(true)

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      })

      if (result.error) {
        setError(result.error.message || "สมัครสมาชิกไม่สำเร็จ")
        return
      }

      // Auto-create first workspace after signup
      await authClient.organization.create({
        name: `${name} Workspace`,
        slug: email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-"),
      })

      router.push("/")
      router.refresh()
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-6 text-center text-xl font-semibold text-gray-900 dark:text-gray-100">
        สมัครสมาชิก
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="ชื่อ">
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
            placeholder="ชื่อของคุณ"
          />
        </Field>

        <Field label="อีเมล">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="รหัสผ่าน">
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
            placeholder="อย่างน้อย 8 ตัวอักษร"
          />
        </Field>

        <Field label="ยืนยันรหัสผ่าน">
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClasses}
            placeholder="••••••••"
          />
        </Field>

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  )
}
