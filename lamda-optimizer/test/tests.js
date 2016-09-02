var assert = chai.assert;
var expect = chai.expect;

mocha.setup('bdd');

beforeEach(function() {
    require.reset();
    require.config({
        baseUrl: "modules"
    })
});

function getDefines(responseText) {
    var regex = /define\('(.*?)'/g;

    var matches, output = [];
    while (matches = regex.exec(responseText)) {
        output.push(matches[1]);
    }
    return output;
}

describe('checking if module dependencies compiled correctly', function() {

    it("Simple module require", function(done) {
        require([
            "SimpleModule"
        ], function(SimpleModule) {
            expect(SimpleModule.name).to.equal("SimpleModule");
            done();
        })
    });

    it("Simple module with Simple Dependencies", function(done) {
        require([
            "ModuleImportingSimpleModules"
        ], function(Module) {
            expect(Module.name).to.equal("ModuleImportingSimpleModules");
            expect(Module.dependencies[0].name).to.equal("SimpleModule1");
            expect(Module.dependencies[1].name).to.equal("SimpleModule2");
            done();
        })
    });

    it("Basic Module Tree (no repeat dependencies)", function(done) {
        require([
            "module-tree/ModuleTree"
        ], function(ModuleTree) {
            expect(ModuleTree.name).to.equal("ModuleTree");
            expect(ModuleTree.dependencies[0].name).to.equal("A");
            expect(ModuleTree.dependencies[1].name).to.equal("B");
            expect(ModuleTree.dependencies[2].name).to.equal("C");
            expect(ModuleTree.dependencies[0].dependencies[0].name).to.equal("AA");
            expect(ModuleTree.dependencies[0].dependencies[1].name).to.equal("AB");
            expect(ModuleTree.dependencies[0].dependencies[0].dependencies[0].name).to.equal("AAA");
            expect(ModuleTree.dependencies[1].dependencies[0].name).to.equal("BA");
            done();

        })
    });

    it("Module Tree with modules with a repeat dependency", function(done) {
        require([
            "module-tree-repeat-dependencies/ModuleTreeRepeatDependencies"
        ], function(ModuleTree) {
            expect(ModuleTree.name).to.equal("ModuleTreeRepeatDependencies");
            expect(ModuleTree.dependencies[0].name).to.equal("A");
            expect(ModuleTree.dependencies[1].name).to.equal("B");
            expect(ModuleTree.dependencies[0].dependencies[0].name).to.equal("C");
            expect(ModuleTree.dependencies[1].dependencies[0].name).to.equal("C");
            done();
        });
    });

    it("Relative Path Resolution", function(done) {
        require([
            "module-tree-relative-paths/ModuleTreeRelativePaths"
        ], function(ModuleTree) {
            expect(ModuleTree.name).to.equal("ModuleTreeRelativePaths");
            expect(ModuleTree.dependencies[0].name).to.equal("A");
            expect(ModuleTree.dependencies[0].dependencies[0].name).to.equal("B");
            done();
        })
    })

    it ("module using plugin", function(done) {
        require([
            "ModuleUsingPlugin"
        ], function (Module) {
            expect(Module.message).to.equal("Hello World!");
            expect(require.s.contexts["_"].definitions.text).to.be.undefined;
            done();
        })
    });
});

describe ("Optimizer Features", function() {
    it ("should have header appended", function(done) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "modules/ModuleWithHeader.js", true);
        xhr.onload = function() {
            expect(xhr.responseText.indexOf("/* My Header */")).to.equal(0);
            done();
        }
        xhr.send();

    });

    it ("should have licences appended if any", function(done) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "modules/ModuleWithLicense.js", true);
        xhr.onload = function() {
            expect(xhr.responseText.indexOf("My License") > 0).to.be.true;
            done();
        }
        xhr.send();
    });

    it ("should automatically remove special modules", function(done) {
        var xhr = new XMLHttpRequest(); 
        xhr.open("GET", "modules/ModuleWithSpecialDependencies.js", true);
        xhr.onload = function() {
            var defineMatches = getDefines(xhr.responseText);
            expect(defineMatches.length).to.equal(1);
            expect(defineMatches[0]).to.equal('ModuleWithSpecialDependencies');
            done();
        };
        xhr.send();
    });

    it ("name and location don't match", function (done) {
        require([
            "LocationModule"
        ], function (LocationModule) {
            expect(LocationModule.name).to.equal("LocationModuleImpl");
            expect(LocationModule.dependencies[0].name).to.equal("LocationModuleImplDependency");
            done();
        })
    });

    // For exclude test, the main difference to check for is 
    // when you export two modules at once that exclude each other.
    // The difference from empty: is that empty completely ignores it
    it ("modules set to empty: are ignored entirely", function(done) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "modules/ModuleImportingEmptyDependency.js", true);
        xhr.onload = function() {
            var defines = getDefines(xhr.responseText);
            expect(defines.length).to.equal(1);
            expect(defines[0]).to.equal("ModuleImportingEmptyDependency");
            require([
                "ModuleImportingEmptyDependency"
            ], function(Module) {
                expect(Module.name).to.equal("ModuleImportingEmptyDependency");
                expect(Module.dependencies[0].name).to.equal("EmptyDependency");
                expect(Module.dependencies[0].dependencies[0].name).to.equal("EmptyDependencyDependency");
                done();
            });
        }
        xhr.send();
    });

    it ("should exclude modules are not included in output", function(done) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "modules/exclude-test/complex-module-1/ComplexModule1.js", true);
        xhr.onload = function() {
            var defines = getDefines(xhr.responseText);
            expect(defines.length).to.equal(3);
            expect(defines.indexOf("exclude-test/complex-module-1/ComplexModule1") > -1).to.be.true;
            expect(defines.indexOf("exclude-test/complex-module-1/ComplexModule1Dependency") > -1).to.be.true;
            expect(defines.indexOf("exclude-test/common-dependency/CommonDependency") > -1).to.be.true;
            done();
        }
        xhr.send();
    });

    it ("super-complex-exclude-test", function (done) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "modules/super-complex-exclude-test/A.js", true);
        xhr.onload = function() {
            var defines = getDefines(xhr.responseText);
            expect(defines.length).to.equal(6);
            expect(defines.indexOf("super-complex-exclude-test/A") > -1).to.be.true;
            expect(defines.indexOf("super-complex-exclude-test/B") > -1).to.be.true;
            expect(defines.indexOf("super-complex-exclude-test/C") > -1).to.be.true;
            expect(defines.indexOf("super-complex-exclude-test/G") > -1).to.be.true;
            expect(defines.indexOf("super-complex-exclude-test/H") > -1).to.be.true;
            expect(defines.indexOf("super-complex-exclude-test/I") > -1).to.be.true;
            done();
        }
        xhr.send();
    });
    
    it ("appending main - TODO: refactor api");
    
})

