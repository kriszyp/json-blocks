var webpack = require('webpack')
var path = require('path')
module.exports = {
    entry: {
        index: './index.js'
    },
    output: {
        path: path.join(__dirname, 'dist'),
        library: 'JSONBlocks',
        libraryTarget: 'umd'
    },
    node: { Buffer: false },
    devtool: 'source-map',
    optimization: {
        minimize: false
    },
    watch: true,
    mode: 'development'
};
