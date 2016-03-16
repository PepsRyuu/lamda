define('text', function () {

    return {
        load: function (fileName, req, onLoad, config) {
            this.fetch(req.toUrl(fileName), function(content) {
                onLoad(content);
            }, function(err) {
                onLoad.error(err);
            });
        },

        write: function(name, content, config) {
            return "define(function () { return '" + content + "';});\n";
        },

        writeFile: function (pluginName, fileName, req, write, config) {
            this.load(fileName, req, function(content) {
                var definition = this.write(pluginName + "!" + fileName, content, config);
                write.asModule(pluginName + "!" + fileName, fileName, definition);
            }.bind(this), config);
        },

        fetch: function(url, callback, errback) {
            if (typeof process !== 'undefined' && process.versions && !!process.versions.node) {
                var fs = nodeRequire('fs');
                var file = fs.readFileSync(url, 'utf8');
                if (file.indexOf('\uFEFF') === 0) {
                    file = file.substring(1);
                }
                callback(file);
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);

                xhr.onreadystatechange = function (evt) {
                    if (xhr.readyState === 4) {
                        if (xhr.status > 399 && xhr.status < 600) {
                            var err = new Error(url + ' HTTP status: ' + xhr.status);
                            err.xhr = xhr;
                            errback(err);
                        } else {
                            callback(xhr.responseText);
                        }
                    }
                };
                xhr.send(null);
            }

        }
    };
});
