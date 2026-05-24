import type { RuntimeStatusItem } from "../types";

export function RuntimeReadiness({
  configured,
  items,
}: {
  configured: boolean;
  items: RuntimeStatusItem[];
}) {
  return (
    <section className="runtime-section" aria-labelledby="runtime-title">
      <div className="section-heading">
        <h2 id="runtime-title">執行環境狀態</h2>
        <p
          className={`session-status ${
            configured ? "session-ready" : "session-warning"
          }`}
        >
          {configured ? "已設定" : "缺少"}
        </p>
      </div>

      <p className="runtime-note">
        值保留於 apps/web/.env.local，不會顯示在此畫面。
      </p>

      <ul className="runtime-list" aria-label="執行環境狀態">
        {items.map((item) => (
          <li key={item.name}>
            <code>{item.name}</code>
            <span
              className={`runtime-state ${
                item.configured ? "runtime-ready" : "runtime-missing"
              }`}
            >
              {item.configured ? "已設定" : "缺少"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
