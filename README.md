lamda.js
=====

Light Asynchronous Module Definition Alternative

Why lamda.js?
----------
* Very light alternative to [require.js](http://requirejs.org/).
* Designed to work with modern browsers, less complicated source.
* More meaningful error messages (for example, which file requested a file that is missing).
* Plans for useful helper functions (such as getting context configuration), as well as a pipeline mechanism where you can validate imported JavaScript files (useful for when working with multiple teams).
* Currently 4KB when compressed versus require.js 19KB

What's supported?
----------
* Context for require calls
* Plugins (Plugin API not fully implemented, just onLoad and toUrl())
* Path configuration

What will not be supported?
---------
* Common JS modules
* Shims


