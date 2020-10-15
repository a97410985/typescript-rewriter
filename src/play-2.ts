import * as ts from "typescript";
const files: { [index: string]: string } = {
  "foo.ts": `const obj = {
code: 100,
message: "network error"
}
if (obj.code === 100) {
  // ...
}`,
};

const languageService = ts.createLanguageService({
  getCompilationSettings() {
    return {};
  },
  getScriptFileNames() {
    return ["foo.ts"];
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

const definitions = languageService.getDefinitionAtPosition("foo.ts", 6);
console.log(definitions);
if (definitions[0]) {
  definitions[0].textSpan;
}
const refs = languageService.findReferences("foo.ts", 6);
console.log(refs);
// languageService.getProgram();
