export default function PricingTable() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-14" aria-labelledby="pricing-heading">
      <h2 id="pricing-heading" className="text-2xl md:text-3xl font-bold">Pricing</h2>
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="p-6 rounded-lg border border-gray-800 bg-black/20">
          <h3 className="text-xl font-semibold">Free Forever</h3>
          <p className="text-3xl font-bold mt-2">$0<span className="text-base font-normal text-gray-400">/mo</span></p>
          <ul className="mt-3 text-sm text-gray-300 list-disc list-inside">
            <li>OpenRouter free models</li>
            <li>Terminal-first workflows</li>
            <li>Git-native tooling</li>
            <li>Community support</li>
            <li>Privacy-first (BYO key)</li>
          </ul>
        </div>
        <div className="p-6 rounded-lg border border-gray-700 bg-black/30 outline outline-2 outline-primary/40">
          <h3 className="text-xl font-semibold">Future Pro (Donations)</h3>
          <p className="text-3xl font-bold mt-2">$X<span className="text-base font-normal text-gray-400">/mo</span></p>
          <ul className="mt-3 text-sm text-gray-300 list-disc list-inside">
            <li>Priority feature previews</li>
            <li>Extended context limits</li>
            <li>Optional support channel</li>
          </ul>
          <p className="mt-3 text-xs text-gray-500">Not enabled yet — we emphasize free access today.</p>
        </div>
      </div>
      <div className="mt-6 text-xs text-gray-400">
        Why free? Vibe routes to community free models via OpenRouter; no accounts required. Donations may fund infra & advanced features without paywalls.
      </div>
    </section>
  );
}
