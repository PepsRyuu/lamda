define("pluginwithdependencies-nested-dependency", function() {
    return {
        message: "hello from dependency"
    }
});


define("pluginwithdependencies-nested", ["require", "pluginwithdependencies-nested-dependency"], function(require, dependency) {
    return {
        load: function (name, req, onLoad, config) {
            onLoad(dependency);
        }
    }
});

define('pluginwithdependencies', ["pluginwithdependencies-nested"], function (nested) {

    return nested;
});
