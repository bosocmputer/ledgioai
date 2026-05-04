export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
            LA
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">LEDGIO AI</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            สร้างทีมผู้เชี่ยวชาญ AI สำหรับตัดสินใจและทำงานร่วมกัน
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
