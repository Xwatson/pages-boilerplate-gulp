const { src, dest, parallel, series, watch } = require('gulp')
const del = require('del')
const browserSync = require('browser-sync')

const loadPlugins = require('gulp-load-plugins') // load插件
const plugins = loadPlugins()
const bsServer = browserSync.create()

let config = {
  base: 'src',
  dist: 'dist',
  temp: '.temp',
  public: 'public',
  server: {
    port: 3000
  },
  style: 'src/assets/styles/*.scss',
  script: 'src/assets/scripts/*.js',
  html: 'src/**/*.html',
  image: 'src/assets/images/**',
  font: 'src/assets/fonts/**',
  data: {
    menus: [
      {
        name: 'Home',
        icon: 'aperture',
        link: 'index.html'
      },
      {
        name: 'About',
        link: 'about.html'
      }
    ],
    pkg: require('./package.json'),
    date: new Date()
  }
}
// 清除
const clean = () => {
  return del([config.dist, config.temp])
}
// 转换样式
const style = () => {
  return src(config.style, { base: config.base }) // 保留原始目录结构
    .pipe(plugins.sass({
      outputStyle: 'expanded' // 格式样式结尾花开括号
    }))
    .pipe(dest(config.temp))
    .pipe(bsServer.reload({ stream: true }))
}

// 转换脚本
const script = () => {
  return src(config.script, { base: config.base })
    .pipe(plugins.babel({ presets: ['@babel/preset-env'] }))
    .pipe(dest(config.temp))
    .pipe(bsServer.reload({ stream: true }))
}

// 模板文件
const html = () => {
  return src(config.html, { base: config.base })
    .pipe(plugins.swig({ defaults: { cache: false }, data: config.data }))
    .pipe(dest(config.temp))
    .pipe(bsServer.reload({ stream: true }))
}

// 图片压缩
const image = () => {
  return src(config.image, { base: config.base })
    .pipe(plugins.imagemin())
    .pipe(dest(config.dist))
}
// 字体处理
const font = () => {
  return src(config.font, { base: config.base })
    .pipe(plugins.imagemin())
    .pipe(dest(config.dist))
}
// 拷贝public
const copy = () => {
  return src(config.public + '/**', { base: 'public' })
    .pipe(dest(config.dist))
}
//
const useref = () => {
  return src(config.temp + '/*.html', { base: config.dist })
    .pipe(plugins.useref({ searchPath: [config.temp, '.'] })) // 处理html中引用的node_modules文件
    .pipe(plugins.if(/\.js$/), plugins.uglify())
    .pipe(plugins.if(/\.css$/), plugins.cleanCss())
    .pipe(plugins.if(/\.html$/), plugins.htmlmin({
      collapseWhitespace: true, // 取出空格
      minifyCss: true, // 压缩html中css
      minifyJs: true, // 压缩html中js
    }))
    .pipe(dest(config.dist))
}
// web服务
const server = () => {
  // 监视文件变动
  watch(config.style, style)
  watch(config.script, script)
  watch(config.html, html)
  // watch(config.image, image)
  // watch(config.font, font)
  // watch(config.public + '/**', copy)
  watch([config.image, config.font, config.public + '/**'], bsServer.reload)
  bsServer.init({
    notify: false,
    // files: config.dist + '/**',
    port: config.server.port,
    server: {
      baseDir: [config.temp, config.base, config.public],
      routes: {
        '/node_modules': 'node_modules'
      },
    }
  })
}

// 并行执行样式、脚本、页面、图片文字编译
const compile = parallel(style, script, html)

// 上线编译
const build = series(
  clean,
  parallel(series(compile, useref), image, font, copy)
)
// 开发任务
const dev = series(compile, server)
module.exports = {
  clean,
  build,
  dev
}
