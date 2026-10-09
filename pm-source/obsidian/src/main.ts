import { Plugin } from "obsidian";
import { parsePhysical, ParseError, renderModel } from "@pm/core";

export default class PhysicalModelChartsPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("physical", (source, el) => {
      el.empty();
      el.addClass("pm-container");
      try {
        el.appendChild(renderModel(parsePhysical(source)));
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
