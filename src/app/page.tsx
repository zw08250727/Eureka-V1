const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function HomePage() {
  return (
    <main className="prototype-shell">
      <iframe title="EurekaMind 原型" src={`${basePath}/prototype/auth-shell.html?v=direct-home-v1`} allow="microphone; clipboard-write" />
    </main>
  );
}
