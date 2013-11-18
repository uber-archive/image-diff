# image-diff [![Build status](https://travis-ci.org/uber/image-diff.png?branch=master)](https://travis-ci.org/uber/image-diff)

Create image differential between two images

This was created as part of a [visual regression][] project.

[visual regression]: http://www.youtube.com/watch?v=1wHr-O6gEfc

## Getting Started
### Requirements
`image-diff` depends on [GraphicsMagick][] and [PhantomJS][].

Please install these before continuing.

[GraphicsMagick]: http://graphicsmagick.org/
[PhantomJS]: http://phantomjs.org/

### Setup
Install the module with: `npm install image-diff`

```javascript
var imageDiff = require('image-diff');
imageDiff({
  actualImage: 'checkerboard.png',
  expectedImage: 'white.png',
  diffImage: 'difference.png',
}, function (err, imagesAreSame) {
  // error will be any errors that occurred
  // imagesAreSame is a boolean whether the images were the same or not
  // diffImage will have an image which highlights differences
});
```

## Documentation
`image-diff` exposes a function for you to callback with.

### `diffImages(options, cb)`
Create an differential image between multiple images

- options `Object`
    - options.actualImage `String` - Path to actual image file
        - options.actualImage **must** exist
    - options.expectedImage `String` - Path to expected image file
        - If options.expectedImage does not exist, a transparent image with the same height/width will be created.
    - options.diffImage `String` - Path to output differential image

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via [grunt](https://github.com/gruntjs/grunt) and test via `npm test`.

## License
Copyright (c) 2013 Uber

Licensed under the MIT license.
