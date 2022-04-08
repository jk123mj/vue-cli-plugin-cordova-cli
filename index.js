const fs = require('fs')
const path = require('path')
const spawn = require('cross-spawn')
const address = require('address')
const portfinder = require('portfinder')
const {info, error} = require('@vue/cli-shared-utils')
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin')
const defaultConfig = require('./default')

module.exports = (api, options) => {
    const runServe = async (args) => {
        switch (false) {
            case !!args.platform:
                error('执行时，缺少platform参数')
                return false
            case !!args.mode:
                error('执行时，缺少mode参数')
                return false
        }
        let platforms = []
        defaultConfig.platforms.forEach(v => {
            if (fs.existsSync(api.resolve(`${defaultConfig.cordovaPath}/platforms/${v}`))) {
                platforms.push(v)
            }
        })
        if (platforms.includes(args.platform)) {
            homeImportCordovaJsHandler(api)
            expressAddMiddlewareHandler(api, args)
            // 执行 run serve
            let port = options.devServer.port || '8080'
            portfinder.basePort = port
            port = await portfinder.getPortPromise()
            const serverUrl = `https://${address.ip()}:${port}`
            const server = await api.service.run('serve', {
                open: options.devServer.open,
                copy: args.copy,
                mode: args.mode,
                host: options.devServer.host || '0.0.0.0',
                port: port,
                https: true
            })

            // 设置环境变量
            process.env.CORDOVA_SERVER_URL = serverUrl
            process.env.CORDOVA_CONFIG_URL = api.resolve(`${defaultConfig.cordovaPath}/platforms/${args.platform}/app/src/main/res/xml/config.xml`)

            execCordovaCleanHandler(api, args)
            // 执行 cordova run
            info(`执行 cordova run ${args.platform}`)
            spawn.sync('cordova', [
                'run',
                args.platform
            ], {
                cwd: api.resolve(defaultConfig.cordovaPath),
                env: process.env,
                stdio: 'inherit',
                encoding: 'utf-8'
            })
            return server
        } else {
            error(`未发现${args.platform},请执行 cordova platform add ${args.platform}`)
        }
    }

    const runBuild = async (args) => {
        switch (false) {
            case !!args.platform:
                error('执行时，缺少platform参数')
                return false
            case !!args.mode:
                error('执行时，缺少mode参数')
                return false
            case !!args.config:
                error('执行时，缺少config参数')
                return false
        }
        homeImportCordovaJsHandler(api)
        const configCont = fs.readFileSync(args.config, {encoding: 'utf-8'})
        const configFormatCont = JSON.parse(configCont)
        // 设置环境变量
        process.env.CORDOVA_SERVER_URL = configFormatCont[args.mode][args.platform].baseUrl
        process.env.CORDOVA_CONFIG_URL = api.resolve(`${defaultConfig.cordovaPath}/platforms/${args.platform}/app/src/main/res/xml/config.xml`)
        // 执行 run build
        await api.service.run('build', {
            mode: args.mode,
            dest: process.env.CORDOVA_SERVER_URL === 'index.html' ? `${defaultConfig.cordovaPath}/www` : 'dist'
        })
        execCordovaCleanHandler(api, args)
        if (process.env.CORDOVA_SERVER_URL !== 'index.html') {
            resetCordovaWWWHandler(api)
        }
        // 执行 cordova build
        const buildConfigUrl = api.resolve(`${defaultConfig.cordovaPath}/build.json`)
        const buildConfigCont = {
            "android": {
                "debug": {
                    "keystore": api.resolve(configFormatCont.development.android.keystore),
                    "storePassword": configFormatCont.development.android.storePassword,
                    "alias": configFormatCont.development.android.alias,
                    "password": configFormatCont.development.android.password,
                    "keystoreType": configFormatCont.development.android.keystoreType,
                    "packageType": configFormatCont.development.android.packageType
                },
                "release": {
                    "keystore": api.resolve(configFormatCont.production.android.keystore),
                    "storePassword": configFormatCont.production.android.storePassword,
                    "alias": configFormatCont.production.android.alias,
                    "password": configFormatCont.production.android.password,
                    "keystoreType": configFormatCont.production.android.keystoreType,
                    "packageType": configFormatCont.production.android.packageType
                }
            }
        }
        fs.writeFileSync(buildConfigUrl, JSON.stringify(buildConfigCont, null, 2))
        const way = args.mode === 'development' ? '--debug' : '--release'
        info(`执行 cordova build ${args.platform} ${way}`)
        let processError
        const buildProcess = spawn('cordova', [
            'build',
            args.platform,
            way,
            '--buildConfig=./build.json'
        ], {
            cwd: api.resolve(defaultConfig.cordovaPath),
            env: process.env,
            stdio: 'inherit',
            encoding: 'utf-8'
        })
        buildProcess.on('close', ()=>{
            if(processError){
                return false
            }
            if (process.env.CORDOVA_SERVER_URL !== 'index.html') {
                moveCordovaFileHandler(api, args)
                info('打包文件合并完成，dist文件夹已更新')
                info('apk容器已生成')
            } else {
                info(`apk已生成`)
            }
        })
        buildProcess.on('error', error=>{
            if(processError){
                return false
            }
            processError = error
        })
    }
    api.registerCommand('cordova-serve', async args => {
        // --platform --mode
        return await runServe(args)
    })

    api.registerCommand('cordova-build', async args => {
        // --platform --mode --config
        return await runBuild(args)
    })
}

/**
 * 在index.html中引入cordova.js
 * */
function homeImportCordovaJsHandler(api) {
    api.chainWebpack(webpackConfig => {
        webpackConfig.plugin('cordova')
            .use(HtmlWebpackIncludeAssetsPlugin, [{
                assets: 'cordova.js',
                append: false,
                publicPath: false
            }])
    })
}

/**
 * devServe添加指定路由器
 * */
function expressAddMiddlewareHandler(api, args) {
    api.configureDevServer(app => {
        app.use((req, res, next) => {
            if (/^\/(cordova|plugins).*/.test(req.url)) {
                const _path = `${defaultConfig.cordovaPath}/platforms/${args.platform}/platform_www/${req.url}`
                if (fs.existsSync(_path)) {
                    const fileContent = fs.readFileSync(_path, {encoding: 'utf-8'})
                    res.send(fileContent)
                }
            } else {
                next()
            }
        })
    })
}

/**
 * 执行 cordova clean
 * */
function execCordovaCleanHandler(api, args) {
    info(`执行 cordova clean ${args.platform}`)
    spawn.sync('cordova', ['clean', args.platform], {
        cwd: api.resolve(defaultConfig.cordovaPath),
        env: process.env,
        stdio: 'inherit',
        encoding: 'utf-8'
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

/**
 * 移动cordova文件处理
 * */
function moveCordovaFileHandler(api, args){
    const prefixUrl = api.resolve(`${defaultConfig.cordovaPath}/platforms/${args.platform}/app/src/main/assets/www`)
    fs.writeFileSync(path.resolve('dist', 'cordova.js'), fs.readFileSync(path.resolve(prefixUrl, 'cordova.js')))
    if (fs.existsSync(path.resolve(prefixUrl, 'cordova_plugins.js'))) {
        fs.writeFileSync(path.resolve('dist', 'cordova_plugins.js'), fs.readFileSync(path.resolve(prefixUrl, 'cordova_plugins.js')))
    }
    if (fs.existsSync(path.resolve(prefixUrl, 'plugins'))) {
        fs.mkdirSync(api.resolve('dist/plugins'))
        copyFolderHandler(path.resolve(prefixUrl, 'plugins'), path.resolve('dist/plugins'))
    }
}

function copyFolderHandler(filePath, aimFilePath) {
    let _filePath = filePath

    function fn(filePath) {
        fs.readdir(filePath, (err, files) => {
            if (err) {
                console.warn(err)
                return false
            }
            files.forEach(v => {
                const _path = path.resolve(filePath, v)
                fs.stat(_path, (err, stats) => {
                    if (err) {
                        console.warn(err)
                        return false
                    }
                    const newFilePath = path.resolve(aimFilePath, _path.slice(_filePath.length + 1))
                    if (stats.isFile()) {
                        fs.writeFileSync(newFilePath, fs.readFileSync(_path, {encoding: 'utf-8'}))
                    }
                    if (stats.isDirectory()) {
                        fs.mkdirSync(newFilePath)
                        fn(_path)
                    }
                })
            })
        })
    }

    fn(_filePath)
}
