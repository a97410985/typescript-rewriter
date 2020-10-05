import { ObjectLiteralTransformer } from "../src/index";
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
  const passDefineInterface = {
    "540ed81a49e41e6c3afa82f0f05f8576b730cc1e": {
      networkAccessError: {
        oriCode: 100,
        code: 8901,
        message: "network access error",
      },
      loginError: {
        oriCode: 200,
        code: 8902,
        message: "account login error",
      },
    },
  } as { [index: string]: any };
  const objectLiteralTransformer = new ObjectLiteralTransformer(
    passDefineInterface
  );
  let result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
    transformers: {
      before: [
        objectLiteralTransformer.literalObjPatternCollector(),
        objectLiteralTransformer.objRemappingTransformer(),
      ],
    },
  });
  const expectResult = `var obj = ErrorType.networkAccessError;
var obj2 = ErrorType.loginError;`;
  expect(result.outputText.replace(/\s/g, "")).toBe(
    expectResult.replace(/\s/g, "")
  );
});
