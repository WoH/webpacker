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

Array.prototype.set = function(name, value, options) {
  set(this, name, value, options)
}

function getLoaders() {
  let result = []
  const paths = sync(resolve(__dirname, 'loaders', '*.js'))
  paths.forEach((path) => {
    const name = basename(path, extname(path))
    result.set(name, require(path))
  })
  return result
}

function getPlugins() {
  let result = []
  result.set('Environment', new webpack.EnvironmentPlugin(JSON.parse(JSON.stringify(process.env))))
  result.set('ExtractText', new ExtractTextPlugin('[name]-[contenthash].css'))
  result.set('Manifest', new ManifestPlugin({ publicPath: assetHost.publicPath, writeToFileEmit: true }))
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

function getBaseConfig() {
  return {
    entry: getEntryObject(),

    output: {
      filename: '[name]-[chunkhash].js',
      chunkFilename: '[name]-[chunkhash].chunk.js',
      path: assetHost.path,
      publicPath: assetHost.publicPath
    },

    resolve: {
      extensions: config.extensions,
      modules: getModulePaths()
    },

    resolveLoader: {
      modules: ['node_modules']
    }
  }
}

function add(array, newEntry, options = {top: false}) {
  options.top ? array.unshift(newEntry) : array.push(newEntry)
}

function getIndexByName(array, name) {
  let result;
  array.filter((entry, index) => {
    if(entry.name === name)
      result = index
  })
  return result
}

function set(array, name, value, options = {top: false}) {
  const index = getIndexByName(array, name)
  if(index || index === 0) {
    array[index] = {name, value}
    if(options.top) {
      array.splice(index, 1)
      return add(array, {name, value}, options)
    }
  } else {
    return add(array, {name, value}, options)
  }
}

function get(array, name) {
  return array[getIndexByName(array, name)]
}

function remove(array, name) {
  const index = getIndexByName(array, name)
  if(index || index === 0) {
    return array.splice(index, 1)
  }
}

module.exports = class Environment {
  constructor() {
    this.loaders = getLoaders()
    this.plugins = getPlugins()
    this.base = getBaseConfig()
    Array.prototype.set = function(name, value, options) {
      return set(this, name, value, options)
    }
    Array.prototype.get = function(name) {
      return get(this, name)
    }
    Array.prototype.remove = function(name) {
      return remove(this, name)
    }
  }

  getLoader(name) {
    return this.loaders[getIndexByName(this.loaders, name)]
  }

  setLoader(name, value, options = {top: false}) {
    return set(this.loaders, name, value, options)
  }

  removeLoader(name) {
    return remove(this.loaders, name)
  }

  getPlugin(name) {
    return this.plugins[getIndexByName(this.plugins, name)]
  }

  setPlugin(name, value, options = {top: false}) {
    return set(this.plugins, name, value, options)
  }

  removePlugin(name) {
    return remove(this.plugins, name)
  }

  getProp(name) {
    return this.base[name]
  }

  setProp(name, value) {
    this.base[name] = value
  }

  removeProp(name) {
    let deletion = this.base[name]
    if(deletion) {
      delete this.base[name]
    }
    return deletion
  }

  toWebpackConfig() {
    let rules = [], plugins = []
    this.loaders.forEach(loader => rules.push(loader.value))
    this.plugins.forEach(plugin => plugins.push(plugin.value))
    return {
      ...this.base,
      module: {rules},
      plugins
    }
  }
}