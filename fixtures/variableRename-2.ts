let c = 10;
console.log(c);
function test2() {
  console.log(c);
  let b = 20;
  (() => {
    console.log(b);
  })();
  test2();
}
test2();
