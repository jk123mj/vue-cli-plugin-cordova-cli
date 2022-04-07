const fs = require('fs')
const hasbin = require('hasbin')
const spawn = require('cross-spawn')
const defaultConfig = require('./default')

module.exports = (api, options) => {
    const _options = {...defaultConfig, ...options}
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
            'android-prod-build': 'vue-cli-service cordova-build --platform=android --mode=production --config="./cordova.config.json"',
            'android-dev-build': 'vue-cli-service cordova-build --platform=android --mode=development --config="./cordova.config.json"',
            'cordova-serve-android': 'vue-cli-service cordova-serve --platform=android --mode=development'
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

            resetCordovaWWWHandler(api)

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
                const contentIndex = lines.findIndex(v => /\s+<content/.test(v))
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
/**
 * 重置cordova项目下www
 * */
function resetCordovaWWWHandler(api){
    fs.rmSync(api.resolve(`${defaultConfig.cordovaPath}/www`), {force: true, recursive: true})
    fs.mkdirSync(api.resolve(`${defaultConfig.cordovaPath}/www`))
    fs.writeFileSync(api.resolve(`${defaultConfig.cordovaPath}/www/index.html`), '')
}
