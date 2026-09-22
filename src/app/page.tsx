const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function HomePage() {
  return (
    <main className="prototype-shell">
      <iframe title="EurekaMind 原型" src={`${basePath}/prototype/index.html?v=sidebar-brand-v2`} allow="microphone; clipboard-write" />
    </main>
  );
}
