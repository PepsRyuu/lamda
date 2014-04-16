define("dep1", ["dep2"], function(dep2) {

    return {
        dep2: dep2
    }

})

define("dep2", ["dep3"], function(dep3) {

    return {
        dep3: dep3
    }

})

define("dep3", function() {

    return {}

})

define(["dep1"], function(dep1) {

    return dep1;

});