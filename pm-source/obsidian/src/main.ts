import { Plugin } from "obsidian";
import { parsePhysical, ParseError, renderModel, mountZoom } from "@pm/core";

export default class PhysicalModelChartsPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("physical", (source, el) => {
      el.empty();
      try {
        const svg = renderModel(parsePhysical(source));
        el.addClass("pm-frame");
        el.createDiv({ cls: "pm-container" }).appendChild(svg);
        mountZoom(el);
      } catch (e) {
        const pre = el.createEl("pre", { cls: "pm-error" });
        if (e instanceof ParseError) {
          pre.setText(
            e.line > 0
              ? `Physical model error (line ${e.line}): ${e.message}`
              : `Physical model error: ${e.message}`
          );
        } else {
          pre.setText(`Physical model error: ${(e as Error).message}`);
        }
      }
    });
  }
}
