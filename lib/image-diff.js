var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var async = require('async');
var gm = require('gm');
var mkdirp = require('mkdirp');
var Tempfile = require('temporary/lib/file');

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
  var diffCmd = [
    'compare',
    '-verbose',
    // TODO: metric and highlight could become constructor options
    '-metric RMSE',
    '-highlight-color RED',
    '-compose Src',
    options.actualPath,
    options.expectedPath,
    options.diffPath
  ].join(' ');
  exec(diffCmd, function processDiffOutput (err, stdout, stderr) {
    // If we failed with no info, callback
    if (err && !stderr) {
      return cb(err);
    }

    // Callback with pass/fail
    // TODO: This is not very multi-lengual =(
    return cb(null, stderr.indexOf('all: 0 (0)') !== -1);
  });
};
ImageDiff.prototype = {
  diff: function (options, callback) {
    // TODO: Break this down more...
    var actualPath = options.actualImage;
    var expectedPath = options.expectedImage;
    var diffPath = options.diffImage;
    var actualTmpPath;
    var expectedTmpPath;
    var imagesAreSame;
    async.waterfall([
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
            actualTmpPath = new Tempfile().path + '.png';
            gm(actualPath).resize(maxWidth, maxHeight).write(actualTmpPath, cb);
          },
          function resizeExpectedImage (cb) {
            // If there was no expected image
            expectedTmpPath = new Tempfile().path + '.png';
            if (expectedSize.doesNotExist) {
              gm(maxWidth, maxHeight, 'transparent').write(expectedTmpPath, cb);
            // Otherwise, resize the image
            } else {
              gm(expectedPath).resize(maxWidth, maxHeight).write(expectedTmpPath, cb);
            }
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
      async.forEach([actualTmpPath, expectedTmpPath], function cleanupFile (filepath, cb) {
        fs.unlink(filepath, cb);
      }, function callOriginalCallback (err) {
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
