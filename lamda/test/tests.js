var assert = chai.assert;
var expect = chai.expect;

mocha.setup('tdd');

setup(function() {
    require.reset();
});

suite('require', function() {

    test("Simple module require", function(done) {
        require([
            "modules/SimpleModule1",
            "modules/SimpleModule2"
        ], function(SimpleModule1, SimpleModule2) {
            assert.equal(SimpleModule1.name, "SimpleModule1");
            assert.equal(SimpleModule2.name, "SimpleModule2");
            done();
        })
    });

    test("Module with Simple Module Dependencies", function(done) {
        require([
            "modules/ModuleImportingSimpleModules"
        ], function(dep) {
            assert.equal(dep.name, "ModuleImportingSimpleModules");
            assert.equal(dep.dependencies[0].name, "SimpleModule1");
            assert.equal(dep.dependencies[1].name, "SimpleModule2");
            done();
        })
    });

    test("Can import modules defined before the require call", function(done) {
        define("dynamic/MyModule", ["./MySubModule"], function(dep) {
            return {
                name: "MyModule",
                dependencies: arguments
            }
        });

        define("dynamic/MySubModule", function() {
            return {
                name: "MySubModule"
            };
        });

        require([
            "dynamic/MyModule"
        ], function(MyModule) {
            assert.equal(MyModule.name, "MyModule");
            assert.equal(MyModule.dependencies[0].name, "MySubModule");
            done();
        })
    });

    test("Module with self-dependencies", function(done) {
        require([
            "modules/ModuleWithSelfDependencies"
        ], function(dep) {
            assert.equal(dep.name, "ModuleWithSelfDependencies");
            assert.equal(dep.dependencies[0].name, "SelfDep");
            assert.equal(dep.dependencies[0].dependencies[0].name, "SubSelfDep");
            done();
        })
    });

    test("Can import the same module twice in the same call", function(done) {
        require([
            "modules/SimpleModule1",
            "modules/SimpleModule1"
        ], function(A, B) {
            assert.equal(A.name, "SimpleModule1");
            assert.equal(B.name, "SimpleModule1");
            assert.equal(A, B);
            done();
        })
    });

    test('Double Require calls to the same module', function (done) {
        var count = 0;
        var assertAndFinish = function(dep) {
            assert.equal(dep.name, "SimpleModule1");
            count++;
            if (count == 2) done();
        };
        
        require([
            "modules/SimpleModule1"
        ], function (A) {
            assertAndFinish(A);
        });

        require([
            "modules/SimpleModule1"
        ], function (A) {
            assertAndFinish(A);
        });
    });

    test('Nested require calls', function (done) {
        require([
            "modules/SimpleModule1"
        ], function (A) {
            assert.equal(A.name, "SimpleModule1");

            require([
                "modules/SimpleModule1", 
                "modules/SimpleModule2"
            ], function(A, B) {
                assert.equal(A.name, "SimpleModule1");
                assert.equal(B.name, "SimpleModule2");
                done();
            })

        });
    });

    test('Error callback triggers when module isn\'t found', function (done) {
        require(['missingmodule'], function (missingmodule) {
            throw new Error("Should not hit here");
        }, function(err) {
            done();
        });
    });

    test("Basic Module Tree (no repeat dependencies)", function(done) {
        require([
            "modules/module-tree/ModuleTree"
        ], function(ModuleTree) {
            assert.equal(ModuleTree.name, "ModuleTree");
            assert.equal(ModuleTree.dependencies[0].name, "A");
            assert.equal(ModuleTree.dependencies[1].name, "B");
            assert.equal(ModuleTree.dependencies[2].name, "C");
            assert.equal(ModuleTree.dependencies[0].dependencies[0].name, "AA");
            assert.equal(ModuleTree.dependencies[0].dependencies[1].name, "AB");
            assert.equal(ModuleTree.dependencies[0].dependencies[0].dependencies[0].name, "AAA");
            assert.equal(ModuleTree.dependencies[1].dependencies[0].name, "BA");
            done();

        })
    });

    test("Basic Module Tree Imported Twice (no repeat dependencies)", function(done) {
        require([
            "modules/module-tree/ModuleTree",
            "modules/module-tree/ModuleTree"
        ], function(ModuleTree1, ModuleTree2) {
            assert.equal(ModuleTree1.name, "ModuleTree");
            assert.equal(ModuleTree1.dependencies[0].name, "A");
            assert.equal(ModuleTree1.dependencies[1].name, "B");
            assert.equal(ModuleTree1.dependencies[2].name, "C");
            assert.equal(ModuleTree1.dependencies[0].dependencies[0].name, "AA");
            assert.equal(ModuleTree1.dependencies[0].dependencies[1].name, "AB");
            assert.equal(ModuleTree1.dependencies[0].dependencies[0].dependencies[0].name, "AAA");
            assert.equal(ModuleTree1.dependencies[1].dependencies[0].name, "BA");

            assert.equal(ModuleTree2.name, "ModuleTree");
            assert.equal(ModuleTree2.dependencies[0].name, "A");
            assert.equal(ModuleTree2.dependencies[1].name, "B");
            assert.equal(ModuleTree2.dependencies[2].name, "C");
            assert.equal(ModuleTree2.dependencies[0].dependencies[0].name, "AA");
            assert.equal(ModuleTree2.dependencies[0].dependencies[1].name, "AB");
            assert.equal(ModuleTree2.dependencies[0].dependencies[0].dependencies[0].name, "AAA");
            assert.equal(ModuleTree2.dependencies[1].dependencies[0].name, "BA");
            done();

        })
    });

    test("Module Tree with modules with a repeat dependency", function(done) {
        require([
            "modules/module-tree-repeat-dependencies/ModuleTreeRepeatDependencies"
        ], function(ModuleTree) {
            assert.equal(ModuleTree.name, "ModuleTreeRepeatDependencies");
            assert.equal(ModuleTree.dependencies[0].name, "A");
            assert.equal(ModuleTree.dependencies[1].name, "B");
            assert.equal(ModuleTree.dependencies[0].dependencies[0].name, "C");
            assert.equal(ModuleTree.dependencies[1].dependencies[0].name, "C");
            done();
        });
    });

    test("Relative Path Resolution", function(done) {
        require([
            "modules/module-tree-relative-paths/ModuleTreeRelativePaths"
        ], function(ModuleTree) {
            assert.equal(ModuleTree.name, "ModuleTreeRelativePaths");
            assert.equal(ModuleTree.dependencies[0].name, "A");
            assert.equal(ModuleTree.dependencies[0].dependencies[0].name, "B");
            done();
        })
    })

    test("Object Dependencies", function(done) {
        require([
            "modules/SimpleObjectModule"
        ], function(SimpleObjectModule) {
            assert.equal(SimpleObjectModule.name, "SimpleObjectModule");
            done();
        })
    })

});

suite("require.config()", function() {
    test("Should merge with global context if context isn't specified", function(done) {
        require.config({
            baseUrl: "newurl"
        });
        assert.equal(require.s.contexts["_"].config.baseUrl, "newurl");
        done();
    })

    test("Should merge with specified context", function(done) {
        require.config({
            context: "mycontext",
            baseUrl: "newurl"
        });
        assert.equal(require.s.contexts["_"].config.baseUrl, "./");
        assert.equal(require.s.contexts["mycontext"].config.baseUrl, "newurl");
        done();
    })

    test("Paths should be merged, packages should be overridden", function(done) {
        require.config({
            paths: {
                path1: "path1value"
            },
            packages: [
                "package1"
            ]
        });

        require.config({
            paths: {
                path2: "path2value"
            },
            packages: [
                "package2"
            ]
        })

        assert.equal(require.s.contexts["_"].config.paths.path1, "path1value");
        assert.equal(require.s.contexts["_"].config.paths.path2, "path2value");
        assert.equal(require.s.contexts["_"].config.packages[0].name, "package2");
        assert.equal(require.s.contexts["_"].config.packages.length, 1);
        done();
    })

});

suite('Path/Packages Resolution', function () {

    test('Path resolves to module on disk', function(done) {
        require({
            paths: {
                "SimpleModule": "modules/SimpleModule1"
            }
        }, [
            "SimpleModule"
        ], function(SimpleModule) {
            assert.equal(SimpleModule.name, "SimpleModule1");
            done();
        });
    });

    test('Exact path takes precedent over other paths', function (done) {
        require({
            paths: {
                "SimpleModule": "modules/SimpleModule1",
                "SimpleModule/SimpleModule": "modules/SimpleModule2"
            }
        }, [
            "SimpleModule/SimpleModule"
        ], function (SimpleModule) {
            assert.equal(SimpleModule.name, "SimpleModule2");
            done();
        });
    });

    test('Package Test with string syntax', function (done) {
        require({
            packages: [
                "simple-package"
            ]
        }, [
            "simple-package",
            "simple-package/SimpleModule"
        ], function (main, SimpleModule) {
            assert.equal(main.name, "SimplePackageMain");
            assert.equal(SimpleModule.name, "SimplePackageSimpleModule");
            done();
        });
    });

    test('Package Test with full syntax', function (done) {
        require({
            packages: [
                {
                    name: "simple-package"
                }
            ]
        }, [
            "simple-package",
            "simple-package/SimpleModule"
        ], function (main, SimpleModule) {
            assert.equal(main.name, "SimplePackageMain");
            assert.equal(SimpleModule.name, "SimplePackageSimpleModule");
            done();
        });
    });

    test('Package Test - different location', function (done) {
        require({
            packages: [
                {
                    name: "simple-package",
                    location: "packages/simple-package"
                }
            ]
        }, [
            "simple-package",
            "simple-package/SimpleModule"
        ], function (main, SimpleModule) {
            assert.equal(main.name, "SimplePackageMain");
            assert.equal(SimpleModule.name, "SimplePackageSimpleModule");
            done();
        });
    });

    test('Package Test - different main', function (done) {
        require({
            packages: [
                {
                    name: "simple-package",
                    location: "packages/simple-package",
                    main: "AlternativeMain"
                }
            ]
        }, [
            "simple-package"
        ], function (main) {
            assert.equal(main.name, "SimplePackageAlternativeMain");
            done();
        });
    });

    test('Package Test - incomplete id for main', function (done) {
        require({
            packages: [
                {
                    name: "main-package",
                    location: "packages/main-package-incomplete-id"
                }
            ]
        }, [
            "main-package",
            "main-package/main"
        ], function (main1, main2) {
            assert.equal(main1.name, "MainPackageIncompleteID");
            assert.equal(main2.name, "MainPackageIncompleteID");
            assert.equal(main1, main2);
            done();
        });
    });

    test('Package Test - full id for main', function (done) {
        require({
            packages: [
                {
                    name: "main-package",
                    location: "packages/main-package-full-id"
                }
            ]
        }, [
            "main-package",
            "main-package/main"
        ], function (main1, main2) {
            assert.equal(main1.name, "MainPackageFullID");
            assert.equal(main2.name, "MainPackageFullID");
            assert.equal(main1, main2);
            done();
        });
    });

    test('Package Test - Incomplete ID and main isn\'t main.js' , function (done) {
        require({
            packages: [{
                name: 'main-package',
                location: 'packages/main-package-incomplete-id-alternative',
                main: 'AlternativeMain'
            }]
        }, [
            "main-package"
        ], function (main) {
            assert.equal(main.name, 'MainPackageIncompleteIDAlternative');
            done();
        });
    });

    test('Package Test - Main package with dependency' , function (done) {
        require({
            packages: [{
                name: 'main-package',
                location: 'packages/main-package-with-dependency'
            }]
        }, [
            "main-package"
        ], function (main) {
            assert.equal(main.name, 'MainPackageWithDependency');
            assert.equal(main.dependencies[0].name, 'Dependency');
            done();
        });
    });

});

suite("Special Imports", function() {
    test("require --> .config() for current context", function(done) {
        define("MyModule", ["require"], function(require) {
            return {
                message: require.config().paths.path1
            }
        })

        require({
            context: "lol",
            paths: {
                path1: "path1value"
            }
        }, [
            "MyModule"
        ], function(MyModule) {
            assert.equal(MyModule.message, "path1value");
            done();
        });
    })

    test("require --> toUrl() to resolve relative to current module", function(done) {
        define("modules/MyModule", ["require"], function(require) {
            return {
                message: require.toUrl("./MyOtherModule")
            }
        })

        require({
            context: "lol",
            baseUrl: "mysrc"
        }, [
            "modules/MyModule"
        ], function(MyModule) {
            assert.equal(MyModule.message, "mysrc/modules/MyOtherModule");
            done();
        });
    })

    test("require can be used for importing modules in the same context", function(done) {

        require([
            "modules/SimpleModule1"
        ], function(GlobalContextSimpleModule) {
            define("modules/MyModule", ["require"], function(require) {
                return {
                    importModule: function(cb) {
                        require([
                            "modules/SimpleModule1"
                        ], function() {
                            cb(arguments[0]);
                        })
                    }
                }
            });

            require({
                context: "lol"
            }, [
                "modules/MyModule"
            ], function(MyModule) {
                MyModule.importModule(function(SimpleModule) {
                    assert.equal(SimpleModule.name, "SimpleModule1");
                    assert.notEqual(GlobalContextSimpleModule, SimpleModule);
                    done();
                })
            });
        });

        
    })
});

suite("Plugins", function() {

    test("Simple Plugin - check arguments are correct", function(done) {
        define("text", function() {
            return {
                load: function(fileName, req, onload, config) {
                    assert.equal(fileName, "message.txt");
                    assert.equal(config.context, "lol");
                    assert.equal(req.toUrl("./message.txt"), "mysrc/message.txt");
                    assert.equal(req.config().context, "lol");
                    onload();
                }
            }
        });

        require({
            context: "lol",
            baseUrl: "mysrc"
        }, [
            "text!./message.txt"
        ], function() {
            done();
        })
    });

    test("Simple Plugin - check localRequire is relative to module that imported text", function(done) {
        define("text", function() {
            return {
                load: function(fileName, req, onload, config) {
                    assert.equal(fileName, "mymodule/message.txt");
                    assert.equal(req.toUrl(fileName), "./mymodule/message.txt");
                    onload();
                }
            }
        });

        define("mymodule/folder/MyModule", [
            "text!../message.txt"
        ], function() {
            return {}
        });

        require([
            "mymodule/folder/MyModule"
        ], function() {
            done();
        })
    });

    test("Simple Plugin - check that localRequire runs in context", function(done) {
        define("somemodule", function() {
            return "somemodule";
        })

        define("text", function() {
            return {
                load: function(fileName, req, onload, config) {
                    req(["somemodule"], function(somemodule) {
                        onload(somemodule);
                    })
                }
            }
        });

        define("mymodule/folder/MyModule", [
            "text!../message.txt"
        ], function(message) {
            return message;
        });

        require([
            "mymodule/folder/MyModule"
        ], function(MyModule) {
            assert.equal(MyModule, "somemodule");
            done();
        })
    });

    test("Real Plugin File - Successfully load snippet", function(done) {
        require({
            paths: {
                "text": "plugins/text"
            }
        }, [
            "text!./snippets/hello.txt"
        ], function(message) {
            assert.equal(message, "hello");
            done();
        })
    })

    test("Real Plugin File - Fail to load snippet", function(done) {
        require({
            paths: {
                "text": "plugins/text"
            }
        }, [
            "text!./snippets/fake.txt"
        ], function(message) {
            throw new Error("Should not hit here");
        }, function() {
            done();
        })
    })

    test('Same plugin dependency asked for twice', function (done) {
        require({
            paths: {
                "text": "plugins/text"
            }
        }, [
            "text!snippets/hello.txt",
            "text!snippets/hello.txt"
        ], function (message1, message2) {
            assert.equal(message1, "hello");
            assert.equal(message2, "hello");
            done();
        });
    });

    test('a plugin which has multiple self-dependencies', function(done) {
        require({
            paths: {
                "PluginWithDependencies": "plugins/PluginWithDependencies"
            }
        }, [
            'PluginWithDependencies!./dummy'
        ], function(message) {
            assert.equal(message, "SubDependency");
            done();
        })
    })

});

