var assert = chai.assert;
var expect = chai.expect;

mocha.setup('tdd');

suite('require', function () {

  setup(function() {
    require.reset();
  })

  test('Dependencies with separate file dependencies', function (done) {
    require([
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

  test('Dependencies inside same file', function (done) {
    require([
      "nested"
    ], function (dep1) {
      expect(dep1.dep2.dep3).not.to.be.undefined;
      done();
    });
  });

  /*test('Text plugin with nested dependencies', function (done) {
    require([
      "text!message.html",
      "text!message2.html"
    ], function (message, message2) {
      assert.equal(message, "Hello World!");
      assert.equal(message2, "Foo Bar!");
      done();
    });
  });*/

  test('No Write plugin', function (done) {
    require([
      "nowriteplugin!message.html",
      "nowriteplugin!message2.html"
    ], function (message, message2) {
      assert.equal(message, "Hello World!");
      assert.equal(message2, "Foo Bar!");
      done();
    });
  });

  test('Package Test with string syntax', function (done) {
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

  test('Package Test with full syntax', function (done) {
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

  test('Paths', function (done) {
    require({
      paths: {
        "mypackage2": "mypackage2/main"
      }
    }, [
      "mypackage2"
    ], function (main) {
      assert.equal(main.message, "main");
      done();
    });
  });

  test('Plugin accessed via path', function (done) {
    require({
      paths: {
        "text": "./plugins/text"
      }
    }, [
      "text!./message.html"
    ], function (message) {
      assert.equal(message, "Hello World!");
      done();
    });
  });


  test('local require config', function (done) {
    require({
      customcontextconfig: "customcontextconfig"
    }, [
      "localrequireconfig"
    ], function (localrequireconfig) {
      assert.equal(localrequireconfig.customcontextconfig, "customcontextconfig");
      done();
    });
  });

  test('double require', function (done) {
    var count = 0;
    require([
      "A"
    ], function (A) {
      assert.equal(A.message, "A");
      count++;
      if (count == 2) done();
    });

    require([
      "A"
    ], function (A) {
      assert.equal(A.message, "A");
      count++;
      if (count == 2) done();

    });
  });

  test('nested require call', function (done) {
    var count = 0;
    require([
      "A"
    ], function (A) {
      assert.equal(A.message, "A");

      require([
        "A", "B"
      ], function(A, B) {
        assert.equal(A.message, "A");
        assert.equal(B.message, "B");
        done();
      })

    });
  });


  test('relative dependencies from package module', function (done) {
    require({
      packages: [{
          name: 'mypackage3'
      }]
    }, ['mypackage3/a'], function (mypackage3) {
        assert.equal(mypackage3.b, 'b');
        done();
      }
    );
  });

  test('relative dependencies from package main', function (done) {
    require({
      packages: [{
          name: 'mypackage3',
          main: 'a'
      }]
    }, ['mypackage3'], function (mypackage3) {
        assert.equal(mypackage3.b, 'b');
        done();
      }
    );
  });

  test('packages where package main defines module name', function (done) {
    require({
      packages: [{
          name: 'mypackage5',
          main: "a"
      }]
    }, ['mypackage5'], function (mypackage5) {
        assert.equal(mypackage5, 'a');
        done();
      }
    );
  });


  test('relative dependencies from package main, with different location for package root', function (done) {
    require({
      packages: [{
          name: 'mypackage4',
          location: "./mypackage4/mypackage4",
          main: "a"
      }]
    }, ['mypackage4'], function (mypackage4) {
        assert.equal(mypackage4.b, 'b');
        done();
      }
    );
  });

  test('mocks', function (done) {
    require({
      mocks: [
        {name: "mymock", dependencies:["A"], callback: function(main) {return main}}
      ]
    }, ['mymock'], function (mymock) {
        assert.equal(mymock.message, "A");
        assert.equal(mymock.AA.message, "AA");
        assert.equal(mymock.AB.message, "AB");
        assert.equal(mymock.AA.AAA.message, "AAA");
        done();
      }
    );
  });

  test('mock accessed via packages depending on another mock', function (done) {
    require({
      mocks: [
        {name: "mymock/MySecondMock", callback: {message: "MySecondMock"}},
        {name: "mymock/MyMock", dependencies:["./MySecondMock"], callback: function(main) {return main}}
      ],
      packages: [
        {name: "mymock", main: "MyMock"}
      ]
    }, ['mymock'], function (mymock) {
        assert.equal(mymock.message, "MySecondMock");
        done();
      }
    );
  });

});

