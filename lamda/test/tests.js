var assert = chai.assert;

mocha.setup('tdd');

suite('require', function () {

  test('Transitive dependencies', function (done) {
    require({
      paths: {
        "lol": "lol"
      }
    }, [
      "./A",
      "./B"
    ], function (A, B) {
      assert.equal(A.message, "A");
      assert.equal(B.message, "B");
      assert.equal(A.AA.message, "AA");
      assert.equal(A.AB.message, "AB");
      assert.equal(B.BC.message, "BC");
      assert.equal(A.AA.AAA.message, "AAA");
      done();
    });
  });

  test('test', function (done) {
    require({
      paths: {
        "lol2": "lol2"
      }
    },[
      "./C",
      "./A"
    ], function (C, A) {
      assert.equal(C.message, "C");
      assert.equal(A.message, "A");
      done();
    });
  });

  test('Text plugin', function (done) {
    require([
      "text!message.html",
      "text!message2.html"
    ], function (message, message2) {
      assert.equal(message, "Hello World!");
      assert.equal(message2, "Foo Bar!");
      done();
    });
  });

  test('Package Test', function (done) {
    require({
      packages: [
        "mypackage"
      ]
    }, [
      "mypackage",
      "mypackage/file"
    ], function (main, file) {
      assert.equal(main.message, "main");
      assert.equal(file.message, "file");
      done();
    });
  });

  test('Package Test 2', function (done) {
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
    ], function (main, file) {
      assert.equal(main.message, "main");
      assert.equal(file.message, "file");
      done();
    });
  });

});

