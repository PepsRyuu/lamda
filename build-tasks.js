var fs = require("fs");
var fork = require('child_process').fork;
var task = process.argv[2];

function parsePackageJson(packageName) {
    return JSON.parse(fs.readFileSync(packageName + "/package.json", "utf8"));
}

switch(task) {
    case "test": 
        var express = require("express");
        var app = express();
        app.use('/', express.static(__dirname));
        app.use(function (req, res) {
            res.status(404).send("File Not Found");
        });
        var server = app.listen(8585, function() {
            var tester = fork("node_modules/mocha-phantomjs/bin/mocha-phantomjs", ["http://127.0.0.1:8585/lamda/test/index.html"]);
            tester.on("exit", function(code) {
                process.exit(code);
            });
        });
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
        } else if (versionType === "minor") {
            currVersion[1]++;
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