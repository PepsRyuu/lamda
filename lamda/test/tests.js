if (window.__karma__) {
  window.__karma__.loaded = function () {};
}

function assertEquals(a, b) {
  var result = (a === b);
  if (result) {
    console.log(a, b, result);
  } else {
    throw new Error('Expected ' + a + ' to equal ' + b);
  }
}

require({
  paths: {
    "lol": "lol"
  }
}, [
  "./A",
  "./B"
], function(A, B) {
  console.log("req1", A);
  assertEquals(A.message, "A");
  assertEquals(B.message, "B");
  assertEquals(A.AA.message, "AA");
  assertEquals(A.AB.message, "AB");
  assertEquals(B.BC.message, "BC");
  assertEquals(A.AA.AAA.message, "AAA");
});

require({
  paths: {
    "lol2": "lol2"
  }
},[
  "./C",
  "./A"
], function(C, A) {
  console.log("req2", A);
  assertEquals(C.message, "C");
  assertEquals(A.message, "A");
})

require([
  "text!message.html",
  "text!message2.html"
], function(message, message2) {
  assertEquals(message, "Hello World!");
  assertEquals(message2, "Foo Bar!");
})

require({
  packages: [
    "mypackage"
  ]
}, [
  "mypackage",
  "mypackage/file"
], function(main, file) {
  console.log("Package Test");
  assertEquals(main.message, "main");
  assertEquals(file.message, "file");
})

require({
  packages: [
    {
      name: "mypackage2",
      location: "mypackage2",
      main: "main"
    }
  ]
}, [
  "mypackage2",
  "mypackage2/file"
], function(main, file) {
  console.log("Package Test 2");
  assertEquals(main.message, "main");
  assertEquals(file.message, "file");
})