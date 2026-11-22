import React from "react";
import { Link } from "react-router-dom";
import ServiceDashboard from "../components/ServiceDashboard";
import { NativeGatewayGuard } from "../components/NativeGatewayGuard";
import { useAuth } from "../helpers/useAuth";
import dashboard from "../components/ServiceDashboard.module.css";
import widgets from "../components/DashboardWidgets.module.css";
import styles from "./__dev.lakeview-preview.module.css";

// Resolve CSS-module names explicitly so the preview never depends on generated-name substrings.
const scope = "." + styles.preview;
const rule = (name: string, css: string) => scope + " ." + name + "{" + css + "}";
const skin = [
  rule(dashboard.app, "display:flex;padding:0;background:var(--background);min-height:calc(100vh - 42px)"),
  rule(dashboard.side, "width:228px;margin:0;padding:28px 16px;flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:6px;border:0;border-radius:0;box-shadow:none;background:#082B4C"),
  rule(dashboard.brand, "width:100%;margin:0 0 28px;padding:0 8px;flex-direction:column;align-items:flex-start;gap:20px;font-size:20px;letter-spacing:-.4px"),
  rule(dashboard.brandLogo, "width:176px;max-width:100%"),
  rule(dashboard.workspace, "display:block;padding:8px 12px;font-size:10px;color:#a9c4d8;letter-spacing:1.5px"),
  rule(dashboard.nav, "width:100%;margin:0;justify-content:flex-start!important;font-size:13px!important;padding:12px!important;border-radius:7px"),
  rule(dashboard.active, "width:100%;margin:0;justify-content:flex-start!important;font-size:13px!important;padding:12px!important;background:#83D2EC!important;color:#082B4C!important;box-shadow:none;border-radius:7px"),
  rule(dashboard.sideBottom, "display:block;padding:32px 12px 0"),
  rule(dashboard.top, "display:flex;height:60px;margin:0;padding:0 28px;border:0;border-bottom:1px solid var(--border);border-radius:0;background:white"),
  rule(dashboard.body, "padding:24px 28px 32px;max-width:1600px;margin:0 auto"),
  rule(dashboard.footerNote, "background:transparent;color:var(--muted-foreground);padding:16px 0;border-top:1px solid var(--border);border-radius:0"),
  rule(dashboard.panel, "box-shadow:none;border-radius:10px"),
  rule(widgets.widget, "box-shadow:none;border-top-width:1px;border-radius:10px"),
  rule(widgets.heading, "box-shadow:none;border:0;background:transparent;padding:0 0 8px"),
  "@media(max-width:900px){" +
    rule(dashboard.app, "display:block") +
    rule(dashboard.side, "width:auto;padding:16px;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px") +
    rule(dashboard.brand, "width:100%;flex-direction:row;align-items:center;margin:0 0 8px;gap:16px") +
    rule(dashboard.brandLogo, "width:120px") +
    rule(dashboard.workspace, "display:none") +
    rule(dashboard.sideBottom, "display:none") +
    rule(dashboard.nav, "width:auto;padding:10px!important;font-size:12px!important") +
    rule(dashboard.active, "width:auto;padding:10px!important;font-size:12px!important") +
    rule(dashboard.body, "padding:20px 16px") +
    rule(dashboard.top, "padding:0 16px") + "}",
].join("\n");

export default function LakeviewPreview() {
  const { authState } = useAuth();
  return <NativeGatewayGuard>
    <div className={styles.preview}>
      <style>{skin}</style>
      <div className={styles.notice}>
        <span><strong>Lakeview design preview</strong> · Current service data</span>
        <Link to="/dashboard">Open current dashboard ↗</Link>
      </div>
      <ServiceDashboard userName={authState.type === "authenticated" ? authState.user.displayName : undefined} />
    </div>
  </NativeGatewayGuard>;
}