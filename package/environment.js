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
    const name = basename(path, extname(path))
    result.push({name: name, value: require(path)})
  })
  return result
}

function getPlugins() {
  const result = []
  result.push({name: 'Environment', value: new webpack.EnvironmentPlugin(JSON.parse(JSON.stringify(process.env)))})
  result.push({name: 'ExtractText', value: new ExtractTextPlugin('[name]-[contenthash].css')})
  result.push({name: 'Manifest', value: new ManifestPlugin({ publicPath: assetHost.publicPath, writeToFileEmit: true })})
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

function addAtPosition(array, newEntry, options = {top: false}) {
  options.top ? [newEntry].concat[array] : [array].concat[newEntry]
}

function getIndexByName(array, name) {
  let result;
  array.filter((entry, index) => {
    if(entry.name === name)
      result = index
  })
  return result
}

function set(array, {name, value}, options = {top: false}) {
  const index = getIndexByName(array, name)
  if(index) {
    array[index] = {name, value}
    if(options.top) {
      delete array[index]
      addAtPosition(array, {name, value}, options)
    }
  } else {
    addAtPosition(array, {name, value}, options)
  }
}

function get(array, name) {
  return array[getIndexByName(array, name)]
}

module.exports = class Environment {
  constructor() {
    this.loaders = getLoaders()
    this.plugins = getPlugins()
    this.base = getBaseConfig()
    Array.prototype.set = function(name, value, options) {
      set(this, {name, value}, options)
    }
    Array.prototype.get = function(name) {
      get(this, name)
    }
  }

  getLoader(name) {
    return this.loaders[getIndexByName(this.loaders, name)]
  }

  setLoader(name, value, options = {top: false}) {
    set(this.loaders, {name, value}, options)
  }

  removeLoader(name) {
    const index = getIndexByName(this.loaders, name)
    if(index) {
      return this.loaders.splice(index, 1)
    }
  }

  getPlugin(name) {
    return this.plugins[getIndexByName(this.plugins, name)]
  }

  setPlugin(name, value, options = {top: false}) {
    set(this.plugins, {name, value}, options)
  }

  removePlugin(name) {
    const index = getIndexByName(this.plugins, name)
    if(index) {
      return this.plugins.splice(index, 1)
    }
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
    this.addProp({name: 'module', value: {rules: rules}})
    this.addProp({name: 'plugins', value: plugins})
    return this.base
  }
}
