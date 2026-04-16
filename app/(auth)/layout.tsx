export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">LEDGIO AI</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            AI Expert Team Builder — สร้างทีมผู้เชี่ยวชาญ AI ของคุณ
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
