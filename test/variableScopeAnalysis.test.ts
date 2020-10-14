import { RenameManager } from "../src/variableScopeAnalysis";
import * as ts from "typescript";
import { removeSpace } from "../src/utils";

describe("retrieve scope", () => {
  test("all same reference in nested scope", () => {
    const renameMap = new Map<
      { s: ts.LineAndCharacter; e: ts.LineAndCharacter },
      string
    >();
    renameMap.set(
      { s: { line: 0, character: 3 }, e: { line: 0, character: 5 } }, // a->a1，變數位置會包含前面的空格= =
      "a1"
    );
    const renameManager = new RenameManager(
      "fixtures/variableRename-1.ts",
      renameMap
    );

    const target = renameManager.program!.getSourceFile(
      "fixtures/variableRename-1.ts"
    );
    let resultProgram = "";
    if (target) {
      const printer: ts.Printer = ts.createPrinter();
      const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
        ts.SourceFile
      >(target, [renameManager.transformerForRename]);
      resultProgram = printer.printFile(result.transformed[0]);
    }
    const expectedResult = `let a1 = 10;
    console.log(a1);
    function fun() {
      console.log(a1);
    }
    fun();`;

    expect(removeSpace(resultProgram)).toEqual(removeSpace(expectedResult));
  });

  test("two variable", () => {
    const renameMap = new Map<
      { s: ts.LineAndCharacter; e: ts.LineAndCharacter },
      string
    >();
    // renameMap.set(JSON.stringify({ pos: 3, end: 5 }), "c1");
    renameMap.set(
      { s: { line: 0, character: 3 }, e: { line: 0, character: 5 } }, // c->c1，變數位置會包含前面的空格= =
      "c1"
    );
    const renameManager = new RenameManager(
      "fixtures/variableRename-2.ts",
      renameMap
    );

    const target = renameManager.program!.getSourceFile(
      "fixtures/variableRename-2.ts"
    );
    let resultProgram = "";
    if (target) {
      const printer: ts.Printer = ts.createPrinter();
      const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
        ts.SourceFile
      >(target, [renameManager.transformerForRename]);
      resultProgram = printer.printFile(result.transformed[0]);
    }
    const expectedResult = `let c1 = 10;
    console.log(c1);
    function test2() {
      console.log(c1);
      let b = 20;
      (() => {
        console.log(b);
      })();
      test2();
    }
    test2();`;

    expect(removeSpace(resultProgram)).toEqual(removeSpace(expectedResult));
  });

  test("two nested variable declarations, reference near", () => {
    const renameMap = new Map<
      { s: ts.LineAndCharacter; e: ts.LineAndCharacter },
      string
    >();
    renameMap.set(
      { s: { line: 0, character: 3 }, e: { line: 0, character: 5 } }, // d->d1
      "d1"
    );
    renameMap.set(
      { s: { line: 5, character: 5 }, e: { line: 5, character: 7 } }, // b->b1
      "b1"
    );
    renameMap.set(
      { s: { line: 7, character: 7 }, e: { line: 7, character: 9 } }, // b->b2
      "b2"
    );
    // renameMap.set(JSON.stringify({ pos: 3, end: 5 }), "d1"); // d->d1
    // renameMap.set(JSON.stringify({ pos: 96, end: 98 }), "b1"); // b->b1
    // renameMap.set(JSON.stringify({ pos: 133, end: 135 }), "b2"); // b->b2

    const renameManager = new RenameManager(
      "fixtures/variableRename-3.ts",
      renameMap
    );

    const target = renameManager.program!.getSourceFile(
      "fixtures/variableRename-3.ts"
    );
    let resultProgram = "";
    if (target) {
      const printer: ts.Printer = ts.createPrinter();
      const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
        ts.SourceFile
      >(target, [renameManager.transformerForRename]);
      resultProgram = printer.printFile(result.transformed[0]);
    }
    const expectedResult = `let d1 = 10;
    console.log(d1);
    // 之後比此處還內層的block都可以存取到此a變數
    function dog() {
      console.log(d1);
      let b1 = 20;
      function test2() {
        let b2= 30;
        console.log(b2); // b會引用離此最近的變數宣告也就是上一行
      }
      test2();
    }
    dog();
    `;

    expect(removeSpace(resultProgram)).toEqual(removeSpace(expectedResult));
  });
});
