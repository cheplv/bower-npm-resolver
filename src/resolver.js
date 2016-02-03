/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Mickael Jeanroy
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

var tmp = require('tmp');
var path = require('path');
var npmUtils = require('./npm-utils');
var download = require('./download');
var extract = require('./extract');

/**
 * Factory function for the resolver.
 * Will be called only one time by Bower, to instantiate resolver.
 */
module.exports = function resolver(bower) {
  // Extract the package identifier.
  var extractPackageName = function(source) {
    var parts = source.split('=');
    return parts[0].slice(4);
  };

  // Resolver factory returns an instance of resolver
  return {

    // Match method tells whether resolver supports given source
    // It can return either boolean or promise of boolean
    match: function (source) {
      return source.indexOf('npm+') === 0;
    },

    // List available versions of given package.
    // The list of version is automatically fetched from NPM.
    // Bower chooses matching release and passes it to "fetch".
    releases: function (source) {
      var pkg = extractPackageName(source);
      return npmUtils.releases(pkg).then(function(versions) {
        return versions.map(function(v) {
          return {
            target: v,
            version: v
          };
        });
      });
    },

    // Downloads package and extracts it to temporary directory.
    // If an error occurred, the temporary directory will be deleted.
    fetch: function (endpoint, cached) {
      // If cached version of package exists, re-use it
      if (cached && cached.version) {
        return;
      }

      var pkg = extractPackageName(endpoint.source);

      // Directory where the tgz will be stored.
      var tmpTar = tmp.dirSync({
        unsafeCleanup: true
      });

      // Directory where the tgz file will be extracted.
      var tmpPackage = tmp.dirSync({
        unsafeCleanup: true
      });

      return npmUtils.tarball(pkg, endpoint.target)

        // We have the tarball URL, download it.
        .then(function(url) {
          return download.fetch(url, tmpTar.name);
        })

        // Download ok, extract tarball.
        .then(function(tarball) {
          return extract.tgz(tarball, tmpPackage.name);
        })

        // Extraction ok, return the path of the downloaded file.
        .then(function(dir) {
          return {
            tempPath: path.join(dir, 'package'),
            removeIgnores: true
          };
        })

        // When an error occured, remove temporary directory.
        .catch(function() {
          tmpDir.removeCallback();
        })

        // Always remove the temporary directory for the tgz file.
        .finally(function() {
          tmpTar.removeCallback();
        });
    }
  };
}