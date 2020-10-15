import { ObjectLiteralTransformer } from "../src/objectLiteralCollectorAndRemapper";
import * as ts from "typescript";

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
