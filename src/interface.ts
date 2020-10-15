type objectLiteralInterface = {
  // {obj-hash-1:{...}, obj-hash-2:{...}}
  [index: string]: {
    name: string; // 之後生成集中定義的常數物件的名稱
    identifierProp: string; // 辨識相同與否的屬性
    defines: {
      [key: string]: /* object literal名稱 */ {
        /* 每個屬性的名稱和其型別，可能會有ori前綴用來作為轉換的識別 */
        [key: string]: number | string;
      };
    };
  };
};
