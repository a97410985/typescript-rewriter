import * as ts from "typescript";
const files: { [index: string]: string } = {
  "foo.ts": `import Vue from "./vue";
import Component from "./vue-class-component";
import { vueTemplateHtml } from "./variables";

@Component({
    template: vueTemplateHtml,
})
class Carousel<T> extends Vue {
}`,
  "variables.ts": `export const vueTemplateHtml = \`<div></div>\`;`,
  "vue.d.ts": `export namespace Vue { export type Config = { template: string }; }`,
  "vue-class-component.d.ts": `import Vue from "./vue";
export function Component(x: Config): any;`,
};

const languageService = ts.createLanguageService({
  getCompilationSettings() {
    return {};
  },
  getScriptFileNames() {
    return ["foo.ts", "variables.ts", "vue.d.ts", "vue-class-component.d.ts"];
  },
  getScriptVersion(_fileName) {
    return "";
  },
  getScriptSnapshot(fileName) {
    if (fileName === ".ts") {
      return ts.ScriptSnapshot.fromString("");
    }
    return ts.ScriptSnapshot.fromString(files[fileName] || "");
  },
  getCurrentDirectory: () => ".",
  getDefaultLibFileName(options) {
    return ts.getDefaultLibFilePath(options);
  },
});

const definitions = languageService.getDefinitionAtPosition("foo.ts", 160); // 160 is the latter `vueTemplateHtml` position
console.log(definitions);
const refs = languageService.findReferences("foo.ts", 160);
console.log(refs);
