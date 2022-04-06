const fs = require('fs')
const hasbin = require('hasbin')
const spawn = require('cross-spawn')
const defaultConfig = require('./default')

module.exports = (api, options) => {
    const _options = {...options, ...defaultConfig}

    // // 检查cordova是否安装
    // if (fs.existsSync(packagePath)) {
    //     const packageCont = fs.readFileSync(packagePath, {encoding: 'utf-8'})
    //     if ((JSON.parse(packageCont).devDependencies || {}).cordova) {
    //         api.exitLog((JSON.parse(packageCont).devDependencies || {}).cordova)
    //         api.exitLog('cordova已安装')
    //     } else {
    //         api.exitLog('未发现安装cordova,将安装cordova到项目中')
    //         spawn.sync('npm', [
    //             'i',
    //             'cordova',
    //             '--save-dev'
    //         ], {
    //             env: process.env,
    //             stdio: 'inherit',
    //             encoding: 'utf-8'
    //         })
    //         api.exitLog('cordova安装完成')
    //     }
    // } else {
    //     api.exitLog('未检测到项目中包含package.json文件', 'error')
    //     return false
    // }
    const hasCordova = hasbin.sync('cordova')
    if(hasCordova){
        api.exitLog('cordova已安装')
    } else {
        api.exitLog('未发现安装cordova,将安装cordova到项目中')
        spawn.sync('npm', [
            'i',
            'cordova',
            '--save-dev'
        ], {
            env: process.env,
            stdio: 'inherit',
            encoding: 'utf-8'
        })
        api.exitLog('cordova安装完成')
    }
    api.extendPackage({
        scripts: {
            'cordova-serve-android': 'vue-cli-service cordova-serve --platform=android --mode=development',
            'cordova-build-android-dev': 'vue-cli-service cordova-build --platform=android --mode=development --config="./cordova.config.json"'
        },
        vue: {
            publicPath: './',
            pluginOptions: {
            }
        }
    })

    api.onCreateComplete(() => {
        // 更新.gitignore文件
        const ignorePath = api.resolve('.gitignore')
        if (fs.existsSync(ignorePath)) {
            const ignoreCont = fs.readFileSync(ignorePath, {encoding: 'utf-8'})
            let appendCont = '\n# Cordova\n'
            ;['platforms', 'plugins'].forEach(v => {
                appendCont += `/${_options.cordovaPath}/${v}\n`
            })
            fs.writeFileSync(ignorePath, ignoreCont + appendCont)
            api.exitLog(`更新${ignorePath}内容`)

            // 添加cordova.config.json
            const cordovaConfigPath = api.resolve('cordova.config.json')
            const cordovaConfigCont = fs.readFileSync(__dirname + '/config.json',{encoding: 'utf-8'})
            fs.writeFileSync(cordovaConfigPath,cordovaConfigCont)
            api.exitLog(`添加文件: ${cordovaConfigPath}`)
            api.exitLog(`执行cordova create ${_options.cordovaPath} ${_options.id} ${_options.appName}`)
            spawn.sync('cordova', [
                'create',
                _options.cordovaPath,
                _options.id,
                _options.appName
            ], {
                env: process.env,
                stdio: 'inherit',
                encoding: 'utf-8'
            })

            // 添加src-cordova/www/.gitignore
            const wwwIgnorePath = api.resolve(`${_options.cordovaPath}/www/.gitignore`)
            api.exitLog(`创建文件: ${wwwIgnorePath}`)
            fs.writeFileSync(wwwIgnorePath, _options.gitIgnoreContent)

            // 构建平台
            _options.platforms.forEach(v => {
                api.exitLog(`构建${v}平台`)
                spawn.sync('cordova', [
                    'platform',
                    'add',
                    v
                ], {
                    cwd: api.resolve(_options.cordovaPath),
                    env: process.env,
                    stdio: 'inherit',
                    encoding: 'utf-8'
                })
            })

            // 注入钩子
            const configPath = api.resolve(`${_options.cordovaPath}/config.xml`)
            if (fs.existsSync(configPath)) {
                api.exitLog(`更新文件: ${configPath}`)
                const configCont = fs.readFileSync(configPath, {encoding: 'utf-8'})
                const lines = configCont.split(/\r?\n/g)
                const contentIndex = lines.findIndex(v => v.test(/\s+<content/))
                lines.splice(contentIndex, 0, '    <hook type="before_compile" src="../node_modules/vue-cli-plugin-cordova-cli/forward-server.js" />')
                fs.writeFileSync(configPath, lines.join('\n'))
            } else {
                api.exitLog(`未检测到${_options.cordovaPath}中包含config.xml文件`, 'error')
                return false
            }
        } else {
            api.exitLog('未检测到项目中包含.gitignore文件', 'error')
            return false
        }
    })
}
