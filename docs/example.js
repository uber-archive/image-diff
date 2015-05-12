var path = require('path');
var imageDiff = require('../lib/image-diff.js');

imageDiff({
  actualImage: path.join(__dirname, '/images/hello-world.png'),
  expectedImage: path.join(__dirname, '/images/hello.png'),
  diffImage: path.join(__dirname, '/images/hello-diff.png')
}, console.log);
