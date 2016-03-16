# lamda.js [![Build Status](https://travis-ci.org/PepsRyuu/lamda.svg?branch=master)](https://travis-ci.org/PepsRyuu/lamda)

Light Asynchronous Module Definition Alternative

## Why lamda.js?

* Very light alternative to [require.js](http://requirejs.org/) focused on the [AMD pattern](https://github.com/amdjs/amdjs-api/wiki/AMD) only.
* Designed to work with modern browsers, therefore lighter and faster source code.
* Support for more meaningful error messages when modules fail to load.
* Reference-counting based excluding for compiler.
* Designed for scalability.

## Methods

### require(config?: Object, dependencies: Array<String>, callback: Function, errback?: Function)

Require method is the entry point for importing modules. Specifying a list of modules you want to load, and once loaded the callback is executed and passes the result of all of the imported modules. If there's any module missing, the error callback is executed.

```
require([
    "mymodule",
    "myothermodule"
], function(mymodule, myothermodule) {
    
});
```

### define(dependencies: Array<String>, callback: Function)

Modules should be separated into multiple files. Each file should then begin with the define function. Similar to the require call, specify the dependencies you want loaded and then the callback function is executing passing those dependencies. The callback should return a function or object. The returned value is what will be provided to other modules that depend on this module.

```
define([
    "depA",
    "depB"
], function(DepA, DepB) {
    
    return {
        myFunction: function() {
            DepA.doSomething(DepB);
        }
    };
    
})
```

## Require Configuration

There are 3 ways to set up the require configuration:

* `var require = {};` If defined before importing Lamda, this will be taken in as the configuration.
* `require.config({})` Static method that can be called. The object passed is the configuration.
* `require(config, dependencies, callback)` If the first argument when calling require is an object, it's taken as the configuration.

Below are the supported options for the configuration object.

### Base URL

Base URL is the URL which all dependencies, paths, and packages will resolve relatively to. Default is set to "./".

### Context

By default all modules are loaded under the global context. Contexts are useful for when you want to have multiple instances of the same module. This can be useful if you need a module to be loaded fresh, or when you want to use a different version of a library without specifying it in the module dependencies. 

```
mypackage/
    1/ 
        mymodule.js
    2/
        mymodule.js
```

```
require({
    context: "context1",
    paths: {
        "mypackage/mymodule": "mypackage/1/mymodule"
    }
}, [
    "mypackage/mymodule"
], function(mymodule) {
    // Version 1 loaded.
});

require({
    context: "context2",
    paths: {
        "mypackage/mymodule": "mypackage/2/mymodule"
    }
}, [
    "mypackage/mymodule"
], function(mymodule) {
    // Version 2 loaded.
});
```

### Paths 

Paths are used to map module prefixes to file locations. This can be useful if you're importing third-party code. If a path is set to "empty:" it is ignored (useful for compilation).

```
paths: {
    "mymodule": "libs/mymodule",
    "ignoredModule": "empty:"
}
```

The above example would resolve to the following paths:

```
"mymodule" --> "libs/mymodule"
"mymodule/file" --> "libs/mymodule/file"
```

### Packages

The packages options is similar to paths, except assumes that all modules starting with the package name are located in one directory. There's also support for a default main file which will be loaded if only the package name is specified as a dependency.

```
packages: [
    {
        name: "mypkg", (required)
        location: "mypkg/1.2.3", (optional, default is set to name)
        main: "index" (optional, default "main")
    }
]   
```

The above example would resolve to the following paths:

```
"mypkg" --> "mypkg/1.2.3/index.js"
"mypkg/mymodule" --> "mypkg/1.2.3/mymodule.js"    
```

### Path/Packages Resolution

* Locations are resolved relative to baseUrl.
* Paths are resolved first, then packages are resolved.
* Paths that are set to `empty:` are ignored.

## Pre-Defined Modules

### "require"

`require` can be imported as a module. It can be used to dynamically import modules within the current context. It also supports additional methods:

* **config():** Returns the config for the current context.
* **toUrl(path):** Resolves the path relative to the current module. 

## Plugins

A limited subset of the RequireJS plugin model has been implemented. Plugins are AMD modules which implement the plugin interface. Plugins can be used by specifying the plugin as a prefix when importing a file:

```
define([
    "text!./message.txt"
], function(message) {
    
});
```

The above example loads the text plugin, and passes "./message.txt" as an argument into the plugin. When the plugin resolves it will pass the result in the callback.

### Plugin Interface

Plugins should implement the following methods:

**load(resourceName: String, req: Function, onload: Function, config: Object)** 

* `resourceName` passes the argument for the plugin. This is already resolved relatively to the current module.
*  `req` is the local require for the module that is using the plugin. See above "require" import for methods.
* `onload` should be called passing the content. This is the exit function for the plugin.
* `config` is the require config for the current context.

**writeFile(pluginName: String, resourceName: String, req: Function, write: Object, config: Object)**

* `pluginName` is the resolved name for the plugin. 
* `resourceName` is the resolved name for the requested resource.
* `req` is the local require function for the module that's using the plugin.
* `write` contains a single method called `asModule`, see example below.
* `config` is the require config for the current context.

```
writeFile: function(pluginName, resourceName, req, write, config) {
    this.load(resourceName, req, function(content) {
        var output = "define(function(){ return '" + content + "';})\n";
        write.asModule(pluginName + "!" + resourceName, resourceName, output);
    })
}
```

## Frequently Asked Questions

### Is CommonJS-style importing supported?

No. This adds complexity to the loader and promotes multiple ways of working. The goal of this library is to provide the minimum support necessary to develop using anonymous AMD modules consistently. 

### Are circular dependencies supported?

No. Circular dependencies should be refactored to no longer be circular.

# lamda-optimizer.js

Optimiser API for NodeJS.

## How to use lamda-optimizer.js?

`require("lamda-optimizer")(requireConfig, outputdir, callback);`

## Additional Require Config Options

* **modules (Array{Object})**: modules to be exported. Specify "name" (String), "location" (String) and "exclude" (Array<String>). Excludes work off a reference count mechanism. The dependencies of an exclude are only excluded if there is nothing else referencing those dependencies.
* **header (String)**: string to appear on top of every exported module. Useful for appending copyright information.
