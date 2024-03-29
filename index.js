var fs = require('fs')
var path = require('path')
var marked = require('marked')
var package = require('./package.json')

function map(obj, fn) {
  return Object.keys(obj)
    .map(function (key) {
      return fn(obj[key], key)
    })
}


function boogaloo (directory, callback) {
  getSources(directory, function (err, slides) {
    if (err) { return callback(err) }
    if (slides.style) {
      var style = renderStyle(slides.style.files[0])
      delete slides.style
    }
    var rendered = map(slides, function (slide, id) {
      var renderedFiles = slide.files.reduce(function (rendered, file) {
        switch (file.extension) {
          case '.md':
            return rendered.concat(renderSlide(file))
          case '.jpg':
          case '.jpeg':
            return rendered.concat(renderImage(file))
          default:
            return rendered
        }
      }, [])
      return renderedFiles.some(function (x) { return x}) ? wrapSlide(id, renderedFiles.join('\n')) : ''
    })

    var page = wrapPage({
      title: 'Slide Show',
      style: style,
      slides: rendered.join(''),
      generator: package.name + ' ' + package.version,
      repository: 'githubz'
    })
    callback(null, page)
  })
}

function getSources(directory, callback) {
  return fs.readdir(directory, function (err, files) {
    if (err) { return callback(err) }
    var resources = 
      files
      .map(function (file) {
        var ext = path.extname(file)
        return {
          directory: directory,
          path: path.join(directory, file),
          name: path.basename(file, ext),
          extension: ext.toLowerCase()
        }
      })
      .filter(function (file) {
        return /^\d+$/.test(file.name) 
      })
      .reduce(groupBySlide, {})
    callback(null, resources)
  })
}

function groupBySlide(resources, file) {
  resources[file.name] = resources[file.name] || {files: []}
  resources[file.name].files.push(file)
  return resources
}

function renderImage (file) {
  // todo: address multiple mime types
  var data = 'data:image/jpeg;base64,'
  // todo: streamify
  var raw = fs.readFileSync(file.path).toString('base64')
  data += raw
  var html = '<img src="' + data + '" />'
  // var html = '<div class="img" style="background: url("'+data+'");"></div>'
  return html
}

function renderStyle(file) {
  var raw = fs.readFileSync(file.path).toString()
  return '<style>' + raw + '</style>'
}

function renderSlide (file) {
  var raw = fs.readFileSync(file.path).toString()
  return '<div class="contents">' + marked(raw) + '</div>'
}

function wrapSlide(id, contents) {
  var cssClass = id == 1 ? 'slide active' : 'slide'
  var html = '<div id="slide' + id + '" class="' + cssClass + '">' + contents + '</div>\n'
  return html
}

function wrapPage(contents) {
  var template = fs.readFileSync(path.join(__dirname, 'index.html')).toString()
  template = template.replace('{{slides}}', contents.slides || '')
  template = template.replace('{{title}}', contents.title || '')
  template = template.replace('{{style}}', contents.style || '')
  template = template.replace('{{generator}}', contents.generator || '')
  template = template.replace('{{repository}}', contents.repository || '')
  var show_js = fs.readFileSync(path.join(__dirname, 'show.js')).toString()
  var style_css = fs.readFileSync(path.join(__dirname, 'base.css')).toString()
  template = template.replace('<link rel="stylesheet" href="base.css">', '<style>' + style_css + '</style>')
  template = template.replace('<script src="show.js"></script>','<script>'+show_js+'</script>')
  return template
}

module.exports = boogaloo