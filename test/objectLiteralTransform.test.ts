import {
  literalObjPatternCollector,
  objRemappingTransformer,
} from "../src/index";
import ts from "typescript";

test("test object literal replacement to const object reference", () => {
  const source = `
const obj = {
  code: 100,
  message: "network error"
}
const obj2 = {
  message: "login error",
  code: 200
}
`;
  let result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
    transformers: {
      before: [literalObjPatternCollector(), objRemappingTransformer()],
    },
  });
  const expectResult = `var obj = ErrorType.networkAccessError;
var obj2 = ErrorType.loginError;`;
  expect(result.outputText.replace(/\s/g, "")).toBe(
    expectResult.replace(/\s/g, "")
  );
});
