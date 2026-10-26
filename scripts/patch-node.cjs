const zlib = require('node:zlib');

// Polyfill createZstdDecompress if running on Node < 22.15 to prevent undici crash
if (typeof zlib.createZstdDecompress !== 'function') {
  zlib.createZstdDecompress = function () {
    throw new Error('zstd decompression is not supported in this Node runtime');
  };
}

if (!zlib.constants) {
  zlib.constants = {};
}

if (typeof zlib.constants.ZSTD_d_windowLogMax === 'undefined') {
  zlib.constants.ZSTD_d_windowLogMax = 17;
}
