const Environment = require('../environment')
const webpack = require('webpack')
const CompressionPlugin = require('compression-webpack-plugin')

module.exports = class extends Environment {
  constructor() {
    super()

    this.plugins.push(new webpack.optimize.ModuleConcatenationPlugin())

    this.plugins.push(new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
      compress: {
        warnings: false
      },
      output: {
        comments: false
      }
    }))

    this.plugins.push(new CompressionPlugin({
      asset: '[path].gz[query]',
      algorithm: 'gzip',
      test: /\.(js|css|html|json|ico|svg|eot|otf|ttf)$/
    }))
  }

  toWebpackConfig() {
    const result = super.toWebpackConfig()
    result.devtool = 'source-map'
    result.stats = 'normal'
    return result
  }
}
