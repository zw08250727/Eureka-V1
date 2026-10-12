import { marketUrl, markets } from "./config";
export function ReviewLobby() {
  return <main className="review-lobby">
    <section className="review-entry">
      <h1>选择版本</h1>
      <nav className="review-market-grid" aria-label="选择版本">
        {(["cn", "global"] as const)
          .filter(id => !process.env.NEXT_PUBLIC_RELEASE_MARKET || id === process.env.NEXT_PUBLIC_RELEASE_MARKET)
          .map(id => <a className={`review-market-card ${id}`} href={marketUrl(id)} key={id}>
            <span><strong>{markets[id].brand}</strong><small>{markets[id].label}</small></span><span aria-hidden="true">→</span>
          </a>)}
      </nav>
    </section>
  </main>;
}
