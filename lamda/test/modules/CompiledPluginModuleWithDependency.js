define("template!modules/compiled-plugin-module-with-dependency/MyTemplate.html", [
    "./MyModule"
], function() {
    return {
        name: "MyTemplate",
        dependencies: arguments
    };
});

define("modules/compiled-plugin-module-with-dependency/MyModule", function() {
    return {
        name: "MyModule"
    }
});

define([
    "template!modules/compiled-plugin-module-with-dependency/MyTemplate.html"
], function(module) {
    return module;
})