import { ObjectLiteralTransformer } from "../src/objectLiteralCollectorAndRemapper";
import * as ts from "typescript";
import { removeSpace } from "../src/utils";

test("test collect single pattern", () => {
  const objectLiteralTransformer = new ObjectLiteralTransformer(
    "fixtures/objectLiterals-1.ts"
  );

  const target = objectLiteralTransformer.program!.getSourceFile(
    "fixtures/objectLiterals-1.ts"
  );
  let resultProgram = "";
  if (target) {
    const printer: ts.Printer = ts.createPrinter();
    const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
      ts.SourceFile
    >(target, [objectLiteralTransformer.literalObjPatternCollector()]);
    resultProgram = printer.printFile(result.transformed[0]);
  }

  expect(objectLiteralTransformer.getPatternInterface()).toEqual(
    `[{"obj-hash":"540ed81a49e41e6c3afa82f0f05f8576b730cc1e","pattern-shape":{"code":"number","message":"string"}}]`
  );
});

test("test not pass defineInterface but use transform", () => {
  const objectLiteralTransformer = new ObjectLiteralTransformer(
    "fixtures/objectLiterals-1.ts"
  );

  const target = objectLiteralTransformer.program!.getSourceFile(
    "fixtures/objectLiterals-1.ts"
  );
  let resultProgram = "";
  if (target) {
    expect(() => {
      const printer: ts.Printer = ts.createPrinter();
      const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
        ts.SourceFile
      >(target, [
        objectLiteralTransformer.literalObjPatternCollector(),
        objectLiteralTransformer.objRemappingTransformer(),
      ]);
      resultProgram = printer.printFile(result.transformed[0]);
    }).toThrow("defineInterface is empty");
  }
});

test("test extract pattern, central defines const object", () => {
  const passDefineInterface = {
    "540ed81a49e41e6c3afa82f0f05f8576b730cc1e": {
      name: "NetworkError",
      identifierProp: "code",
      defines: {
        networkAccessError: {
          code: 100,
          message: "network access error",
        },
        loginError: {
          code: 200,
          message: "account login error",
        },
      },
    },
  } as objectLiteralInterface;

  const objectLiteralTransformer = new ObjectLiteralTransformer(
    "fixtures/objectLiterals-1.ts",
    passDefineInterface
  );

  const target = objectLiteralTransformer.program!.getSourceFile(
    "fixtures/objectLiterals-1.ts"
  );

  let resultProgram = "";
  if (target) {
    const printer: ts.Printer = ts.createPrinter();
    const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
      ts.SourceFile
    >(target, [
      objectLiteralTransformer.literalObjPatternCollector(),
      objectLiteralTransformer.objRemappingTransformer(),
    ]);
    resultProgram = printer.printFile(result.transformed[0]);
  }
  const expectedResult = `const obj = NetworkError.networkAccessError;
  const obj2 = NetworkError.loginError;`;
  const expectedConstObjCode = `const NetworkError: object = {
    networkAccessError: {
        code: 100,
        message: "network access error"
    },
    loginError: {
        code: 200,
        message: "account login error"
    }
};`;
  expect(removeSpace(resultProgram)).toBe(removeSpace(expectedResult));
  expect(removeSpace(objectLiteralTransformer.generatedConstObjCode)).toBe(
    removeSpace(expectedConstObjCode)
  );
});
