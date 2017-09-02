/* eslint global-require: 0 */
/* eslint import/no-dynamic-require: 0 */

const config = require('./config')
const assetHost = require('./asset_host')

const { basename, dirname, join, relative, resolve } = require('path')
const { sync } = require('glob')
const extname = require('path-complete-extname')

const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const ManifestPlugin = require('webpack-manifest-plugin')

function getLoaders() {
  const result = []
  const paths = sync(resolve(__dirname, 'loaders', '*.js'))
  paths.forEach((path) => {
    result.push(require(path))
  })
  return result
}

function getPlugins() {
  const result = []
  result.push(new webpack.EnvironmentPlugin(JSON.parse(JSON.stringify(process.env))))
  result.push(new ExtractTextPlugin('[name]-[contenthash].css'))
  result.push(new ManifestPlugin({ publicPath: assetHost.publicPath, writeToFileEmit: true }))
  return result
}

function getExtensionsGlob() {
  const { extensions } = config
  if (!extensions.length) {
    throw new Error('You must configure at least one extension to compile in webpacker.yml')
  }
  return extensions.length === 1 ? `**/${extensions[0]}` : `**/*{${extensions.join(',')}}`
}

function getEntryObject() {
  const result = {}
  const glob = getExtensionsGlob()
  const rootPath = join(config.source_path, config.source_entry_path)
  const paths = sync(join(rootPath, glob))
  paths.forEach((path) => {
    const namespace = relative(join(rootPath), dirname(path))
    const name = join(namespace, basename(path, extname(path)))
    result[name] = resolve(path)
  })
  return result
}

function getModulePaths() {
  let result = [resolve(config.source_path), 'node_modules']
  if (config.resolved_paths) {
    result = result.concat(config.resolved_paths)
  }
  return result
}

function addAtPosition(acc, add, options = {top: true}) {
  options.top ? [add].concat[acc] : [acc].concat[add]
}

function getBaseConfig(loaders, plugins) {
  return {
    entry: getEntryObject(),

    output: {
      filename: '[name]-[chunkhash].js',
      chunkFilename: '[name]-[chunkhash].chunk.js',
      path: assetHost.path,
      publicPath: assetHost.publicPath
    },

    module: {
      rules: loaders
    },

    plugins: plugins,

    resolve: {
      extensions: config.extensions,
      modules: getModulePaths()
    },

    resolveLoader: {
      modules: ['node_modules']
    }
  }
}
module.exports = class Environment {
  constructor() {
    this.loaders = getLoaders()
    this.plugins = getPlugins()
    this.base = getBaseConfig(this.loaders, this.plugins)
  }

  addPlugin(plugin, options) {
    addAtPosition(this.plugins, plugin, options)
  }

  addLoader(loader, options) {
    addAtPosition(this.loaders, loader, options)
  }

  addProp(prop) {
    base.prop = prop
  }

  getProp(name) {
    return base.prop
  }

  toWebpackConfig() {
    return this.base
  }
}
