var fs = require("fs");
var fork = require('child_process').fork;
var task = process.argv[2];

function parsePackageJson(packageName) {
    return JSON.parse(fs.readFileSync(packageName + "/package.json", "utf8"));
}

function executeTest(fileName) {
    var express = require("express");
    var app = express();
    app.use('/', express.static(__dirname));
    app.use(function (req, res) {
        res.status(404).send("File Not Found");
    });
    var server = app.listen(8585, function() {
        var tester = fork("node_modules/mocha-phantomjs/bin/mocha-phantomjs", ["http://127.0.0.1:8585/" + fileName]);
        tester.on("exit", function(code) {
            process.exit(code);
        });
    });
}

switch(task) {
    case "test-lamda": 
        executeTest("lamda/test/index.html");
        break;

    case "test-optimizer": 
        var optimizer = require("./lamda-optimizer/lamda-optimizer");
        optimizer({
            baseUrl: "lamda-optimizer/test/modules",
            paths: {
                "text": "../text",
                "EmptyDependency": "empty:"
            },
            modules: [
                {name: "SimpleModule"},
                {name: "ModuleImportingSimpleModules"},
                {name: "module-tree/ModuleTree"},
                {name: "module-tree-relative-paths/ModuleTreeRelativePaths"},
                {name: "module-tree-repeat-dependencies/ModuleTreeRepeatDependencies"},
                {name: "ModuleUsingPlugin", exclude: ["text"]},
                {name: "ModuleWithSpecialDependencies"},
                {name: "LocationModule", location: "location-module-impl/LocationModuleImpl"},
                {name: "ModuleImportingEmptyDependency"},
                {name: "exclude-test/complex-module-1/ComplexModule1", exclude: ["exclude-test/complex-module-2/ComplexModule2"]},
                {name: "exclude-test/complex-module-2/ComplexModule2"}
            ]
        }, "lamda-optimizer/target/test/modules", function(){});

        optimizer({
            baseUrl: "lamda-optimizer/test/modules",
            header: "/* My Header */",
            minify: true,
            modules: [
                {name: "ModuleWithHeader"}
            ]
        }, "lamda-optimizer/target/test/modules");

        optimizer({
            baseUrl: "lamda-optimizer/test/modules",
            minify: true,
            modules: [
                {name: "ModuleWithLicense"}
            ]
        }, "lamda-optimizer/target/test/modules");

        optimizer({
            baseUrl: "lamda-optimizer/test/modules",
            modules: [
                {name: "EmptyDependency"}
            ]
        }, "lamda-optimizer/target/test/modules");

        executeTest("lamda-optimizer/target/test/index.html");
        break;

    case "get-version":
        console.log(parsePackageJson("lamda").version);
        break;

    case "update-version":
        var lamdaPackageJson = parsePackageJson("lamda");

        var versionType = process.argv[3];
        var currVersion = lamdaPackageJson.version.match(/\d+/g).map(function(value) {
            return parseInt(value, 10);
        });
        console.log("Old Version: " + lamdaPackageJson.version);

        if (versionType === "major") {
            currVersion[0]++;
            currVersion[1] = 0;
            currVersion[2] = 0;
        } else if (versionType === "minor") {
            currVersion[1]++;
            currVersion[2] = 0;
        } else {
            currVersion[2]++;
        }

        lamdaPackageJson.version = currVersion.join(".");
        fs.writeFileSync("lamda/package.json", JSON.stringify(lamdaPackageJson, null, 4));
        console.log("New Version: " + lamdaPackageJson.version);

        var optimizerPackageJson = parsePackageJson("lamda-optimizer");
        optimizerPackageJson.version = lamdaPackageJson.version;
        optimizerPackageJson.dependencies.lamda = lamdaPackageJson.version;
        fs.writeFileSync("lamda-optimizer/package.json", JSON.stringify(optimizerPackageJson, null, 4));
        break;
}