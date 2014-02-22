var imageDiff = require('../lib/image-diff.js');
imageDiff({
  actualImage: __dirname + '/images/hello-world.png',
  expectedImage: __dirname + '/images/hello.png',
  diffImage: __dirname + '/images/hello-diff.png'
}, console.log);
