let d = 10;
console.log(d);
// 之後比此處還內層的block都可以存取到此a變數
function dog() {
  console.log(d);
  let b = 20;
  function test2() {
    let b = 30;
    console.log(b); // b會引用離此最近的變數宣告也就是上一行
  }
  test2();
}
dog();
