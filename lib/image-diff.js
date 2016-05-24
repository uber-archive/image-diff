// Load in our dependencies
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var async = require('async');
var gm = require('gm').subClass({imageMagick: true});
var bufferedSpawn = require('buffered-spawn');
var mkdirp = require('mkdirp');
var tmp = require('tmp');

// DEV: If we want to restructure away from a class
//   I (@twolfson) suggest writing to `exports` (e.g. `exports.getBooleanResult`, `exports.getFullResult`)
//   then making `module.exports = _.extend(exports.getBooleanResult, exports);`

// Define custom resize function
function transparentExtent(gm, params) {
  // Assert we received our parameters
  assert.notEqual(params.width, undefined);
  assert.notEqual(params.height, undefined);

  // Fill in new space with white background
  // TODO: Parameterize background color (should be considered 'transparent' color in this case)
  gm.background('transparent');

  // Anchor image to upper-left
  // TODO: Parameterize anchor point
  gm.gravity('NorthWest');

  // Specify new image size
  gm.extent(params.width, params.height);

  // Return gm instance for a fluent interface
  return gm;
}

function ImageDiff() {
}
ImageDiff.getImageSize = function (filepath, cb) {
  // TODO: This could be done via pngjs but stick to imagemagick for now
  fs.stat(filepath, function (err, stats) {
    // If the file does not exist, callback with info
    if (err) {
      if (err.code === 'ENOENT') {
        return cb(null, null);
      } else {
        return cb(err);
      }
    }

    gm(filepath).size(function (err, value) {
      if (err) {
        return cb(err);
      }
      cb(null, value);
    });
  });
};
ImageDiff.extractDifference = function (output) {
  // Attempt to find variant between 'all: 0 (0)', 'all: 40131.8 (0.612372)', or 'all: 0.460961 (7.03381e-06)'
  // DEV: According to http://www.imagemagick.org/discourse-server/viewtopic.php?f=1&t=17284
  // DEV: These values are the total square root mean square (RMSE) pixel difference across all pixels and its percentage
  // TODO: This is not very multi-lengual =(
  var resultInfo = output.match(/all: (\d+(?:\.\d+)?(?:[Ee]-?\d+)?) \((\d+(?:\.\d+)?(?:[Ee]-?\d+)?)\)/);
  if (!resultInfo) {
    throw new Error('Expected output to contain \'all\' but received "' + output + '"');
  }
  return {
    total: parseFloat(resultInfo[1], 10),
    percentage: parseFloat(resultInfo[2], 10)
  };
};
ImageDiff.createDiff = function (options, cb) {
  // http://www.imagemagick.org/script/compare.php
  var diffCmd = 'compare';
  var diffArgs = [
    '-verbose',
    // TODO: metric and highlight could become constructor options
    '-metric', 'RMSE',
    '-highlight-color', 'RED']
    // Shadow options if options.shadow is set
    .concat(options.shadow ? [] : ['-compose', 'Src'])
    // Paths to actual, expected, and diff images
    .concat([
    options.actualPath,
    options.expectedPath,
    // If there is no output image, then output to `stdout` (which is ignored)
    options.diffPath || '-'
  ]);
  // Ignore `stdin` and `stdout` (useful for ignoring when images are being sent to stdout)
  var spawnOptions = {stdio: ['ignore', 'ignore', 'pipe']};
  bufferedSpawn(diffCmd, diffArgs, spawnOptions, function processDiffOutput (err, stdout, stderr) {
    // If we failed with no info, callback
    if (err && !stderr) {
      return cb(err);
    }

    // Callback with raw result
    return cb(null, stderr);
  });
};
ImageDiff.prototype = {
  rawDiff: function (options, callback) {
    // TODO: Break this down more...
    var actualPath = options.actualImage;
    var expectedPath = options.expectedImage;
    var diffPath = options.diffImage;
    var shadow = options.shadow;

    // Assert our options are passed in
    if (!actualPath) {
      return process.nextTick(function () {
        callback(new Error('`options.actualPath` was not passed to `image-diff`'));
      });
    }
    if (!expectedPath) {
      return process.nextTick(function () {
        callback(new Error('`options.expectedPath` was not passed to `image-diff`'));
      });
    }

    var actualTmpPath;
    var expectedTmpPath;
    var rawResult;
    async.waterfall([
      function assertActualPathExists (cb) {
        fs.exists(actualPath, function handleActualExists (actualExists) {
          if (actualExists) {
            cb();
          } else {
            cb(new Error('`image-diff` expected "' + actualPath + '" to exist but it didn\'t'));
          }
        });
      },
      function collectImageSizes (cb) {
        // Collect the images sizes
        async.map([actualPath, expectedPath], ImageDiff.getImageSize, cb);
      },
      function resizeImages (sizes, cb) {
        // Find the maximum dimensions
        var actualSize = sizes[0];
        var expectedSize = sizes[1] || {doesNotExist: true, height: 0, width: 0};
        var maxHeight = Math.max(actualSize.height, expectedSize.height);
        var maxWidth = Math.max(actualSize.width, expectedSize.width);

        // Resize both images
        async.parallel([
          function resizeActualImage (cb) {
            // Get a temporary filepath
            tmp.tmpName({postfix: '.png'}, function (err, filepath) {
              // If there was an error, callback
              if (err) {
                return cb(err);
              }

              // Otherwise, resize the image
              actualTmpPath = filepath;
              transparentExtent(gm(actualPath), {
                width: maxWidth,
                height: maxHeight
              }).write(actualTmpPath, cb);
            });
          },
          function resizeExpectedImage (cb) {
            tmp.tmpName({postfix: '.png'}, function (err, filepath) {
              // If there was an error, callback
              if (err) {
                return cb(err);
              }

              // If there was no expected image, create a transparent image to compare against
              expectedTmpPath = filepath;
              if (expectedSize.doesNotExist) {
                gm(maxWidth, maxHeight, 'transparent').write(expectedTmpPath, cb);
              // Otherwise, resize the image
              } else {
                transparentExtent(gm(expectedPath), {
                  width: maxWidth,
                  height: maxHeight
                }).write(expectedTmpPath, cb);
              }
            });
          }
        ], cb);
      },
      function createDiffDirectory (/*..., cb*/) {
        var cb = [].slice.call(arguments, -1)[0];
        if (diffPath) {
          mkdirp(path.dirname(diffPath), function (err) {
            cb(err);
          });
        } else {
          process.nextTick(cb);
        }
      },
      function createDiff (cb) {
        ImageDiff.createDiff({
          actualPath: actualTmpPath,
          expectedPath: expectedTmpPath,
          diffPath: diffPath,
          shadow: shadow
        }, function saveResult (err, _rawResult) {
          rawResult = _rawResult;
          cb(err);
        });
      }
    ], function cleanup (err) {
      // Clean up the temporary files
      var cleanupPaths = [actualTmpPath, expectedTmpPath].filter(function (filepath) {
        return !!filepath;
      });
      async.forEach(cleanupPaths, function cleanupFile (filepath, cb) {
        fs.unlink(filepath, cb);
      }, function callOriginalCallback (_err) {
        // Callback with the raw result
        callback(err, rawResult);
      });
    });
  },
  fullDiff: function (options, cb) {
    // Create a raw diff
    this.rawDiff(options, function handleRawDiff (err, rawResult) {
      // If there was an error, callback with it
      if (err) {
        return cb(err);
      }

      // Otherwise, parse the result and callback
      cb(null, ImageDiff.extractDifference(rawResult));
    });
  },
  diff: function (options, cb) {
    // Create a full diff
    this.fullDiff(options, function handleFullDiff (err, difference) {
      // If there was an error, callback with it
      if (err) {
        return cb(err);
      }

      // Otherwise, validate the difference and callback
      cb(null, difference.total === 0);
    });
  }
};

// Create helper utilities
function imageDiff(options, cb) {
  var differ = new ImageDiff();
  differ.diff(options, cb);
}
imageDiff.getFullResult = function (options, cb) {
  var differ = new ImageDiff();
  differ.fullDiff(options, cb);
};
imageDiff.getRawResult = function (options, cb) {
  var differ = new ImageDiff();
  differ.rawDiff(options, cb);
};

// Export the original class and helper
imageDiff.ImageDiff = ImageDiff;
module.exports = imageDiff;
