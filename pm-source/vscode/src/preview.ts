// Markdown-preview script (runs inside the preview webview, not the extension
// host): adds zoom controls to every rendered model.
//
// On each edit the preview diffs the new HTML into the page, which drops the
// toolbar and the zoom class but keeps the frame elements, so mountZoom just
// runs again after every update and restores each model's zoom.

import { mountZoom } from "@pm/core";

function mountAll(): void {
  document.querySelectorAll<HTMLElement>(".pm-frame").forEach(mountZoom);
}

window.addEventListener("vscode.markdown.updateContent", mountAll);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountAll);
else mountAll();
