import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="app-title">
        <p className="eyebrow">v1.0.0 工程化阶段</p>
        <h1 id="app-title">动物侦探城</h1>
        <p className="lead">
          React + TypeScript + Vite 工程骨架已经就位。当前步骤只建立工程基础，正式学习体验仍由根目录静态 MVP 承载。
        </p>
        <dl className="status-grid" aria-label="工程骨架状态">
          <div>
            <dt>前端工程</dt>
            <dd>apps/web</dd>
          </div>
          <div>
            <dt>内容包</dt>
            <dd>content/</dd>
          </div>
          <div>
            <dt>后续模块</dt>
            <dd>content-runtime / game-core / ui</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
