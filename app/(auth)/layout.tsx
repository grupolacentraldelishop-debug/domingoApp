export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10 bg-cream-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl">Dominga</h1>
          <p className="text-ink-subtle text-sm mt-1">
            Gestión de pop-ups
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
