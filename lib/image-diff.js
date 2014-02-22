var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var async = require('async');
var gm = require('gm').subClass({imageMagick: true});
var shellQuote = require('shell-quote');
var mkdirp = require('mkdirp');
var tmp = require('tmp');

// Define custom resize function
// Taken from https://github.com/twolfson/twolfson.com/blob/3.4.0/test/perceptual-tests/twolfson.com_test.js#L88-L107
// TODO: Make image resizing its own library
// DEV: This does not pollute gm.prototype
gm.prototype.fillFromTo = function (params) {
  // Fill in new space with white background
  // TODO: Parameterize background color (should be considered 'transparent' color in this case)
  this.borderColor('transparent');
  this.border(Math.max(params.toWidth - params.fromWidth, 0), Math.max(params.toHeight - params.fromHeight, 0));

  // Anchor image to upper-left
  // TODO: Parameterize anchor point
  this.gravity('SouthEast');

  // Specify new image size
  this.crop(params.toWidth, params.toHeight, 0, 0);

  // Return this instance
  return this;
};

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
ImageDiff.createDiff = function (options, cb) {
  // http://www.imagemagick.org/script/compare.php
  var diffCmd = shellQuote.quote([
    'compare',
    '-verbose',
    // TODO: metric and highlight could become constructor options
    '-metric', 'RMSE',
    '-highlight-color', 'RED',
    '-compose', 'Src',
    options.actualPath,
    options.expectedPath,
    options.diffPath
  ]);
  exec(diffCmd, function processDiffOutput (err, stdout, stderr) {
    // If we failed with no info, callback
    if (err && !stderr) {
      return cb(err);
    }

    // Attempt to find variant between 'all: 0 (0)' or 'all: 40131.8 (0.612372)'
    // DEV: According to http://www.imagemagick.org/discourse-server/viewtopic.php?f=1&t=17284
    // DEV: These values are the total square root mean square (RMSE) pixel difference across all pixels and its percentage
    // TODO: This is not very multi-lengual =(
    var resultInfo = stderr.match(/all: (\d+\.?\d*) \((\d+\.?\d*)\)/);

    // If there was no resultInfo, throw a fit
    if (!resultInfo) {
      return cb(new Error('Expected `image-diff\'s stderr` to contain \'all\' but received "' + stderr + '"'));
    }

    // Callback with pass/fail
    var totalDifference = resultInfo[1];
    return cb(null, totalDifference === '0');
  });
};
ImageDiff.prototype = {
  diff: function (options, callback) {
    // TODO: Break this down more...
    var actualPath = options.actualImage;
    var expectedPath = options.expectedImage;
    var diffPath = options.diffImage;

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
    if (!diffPath) {
      return process.nextTick(function () {
        callback(new Error('`options.diffPath` was not passed to `image-diff`'));
      });
    }

    var actualTmpPath;
    var expectedTmpPath;
    var imagesAreSame;
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
              gm(actualPath).fillFromTo({
                fromWidth: actualSize.width,
                fromHeight: actualSize.height,
                toWidth: maxWidth,
                toHeight: maxHeight
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
                gm(expectedPath).fillFromTo({
                  fromWidth: expectedSize.width,
                  fromHeight: expectedSize.height,
                  toWidth: maxWidth,
                  toHeight: maxHeight
                }).write(expectedTmpPath, cb);
              }
            });
          }
        ], cb);
      },
      function createDiffDirectory (/*..., cb*/) {
        var cb = [].slice.call(arguments, -1)[0];
        mkdirp(path.dirname(diffPath), function (err) {
          cb(err);
        });
      },
      function createDiff (cb) {
        ImageDiff.createDiff({
          actualPath: actualTmpPath,
          expectedPath: expectedTmpPath,
          diffPath: diffPath
        }, function saveResult (err, _imagesAreSame) {
          imagesAreSame = _imagesAreSame;
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
        // Callback with the imagesAreSame
        callback(err, imagesAreSame);
      });
    });
  }
};

// Create helper utility
function diffImages(options, cb) {
  var differ = new ImageDiff();
  differ.diff(options, cb);
}

// Export the original class and helper
diffImages.ImageDiff = ImageDiff;
module.exports = diffImages;
