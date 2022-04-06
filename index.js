const spawn = require('cross-spawn')
const fs = require('fs')
const {info, error} = require('@vue/cli-shared-utils')
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-tags-plugin')
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
            // 在index.html中引入cordova.js
            api.chainWebpack(webpackConfig => {
                webpackConfig.plugin('cordova')
                    .use(HtmlWebpackIncludeAssetsPlugin, [{
                        append: false,
                        scripts: 'cordova.js',
                        publicPath: false
                    }])
            })
            // devServe添加指定路由器
            api.configureDevServer(app => {
                app.get('/cordova.js', (req, res) => {
                    const _path = `${defaultConfig.cordovaPath}/platforms/${args.platform}/platform_www/cordova.js`
                    if (fs.readFileSync(_path)) {
                        const fileContent = fs.readFileSync(_path, {encoding: 'utf-8'})
                        res.send(fileContent)
                    }
                })
            })
            // 执行 run serve
            const serverUrl = `${options.devServer.https ? 'https' : 'http'}://${options.devServer.host}:${options.devServer.port}`
            const server = await api.service.run('serve', {
                open: options.devServer.open,
                copy: args.copy,
                mode: args.mode,
                host: options.devServer.host,
                port: options.devServer.port,
                https: options.devServer.https
            })

            // 设置环境变量
            process.env.CORDOVA_SERVER_URL = serverUrl

            process.env.CORDOVA_CONFIG_URL = api.resolve(`${defaultConfig.cordovaPath}/platforms/${args.platform}/app/src/main/res/xml/config.xml`)

            // 执行 cordova clean
            info(`执行 cordova clean ${args.platform}`)
            spawn.sync('cordova', ['clean', args.platform], {
                cwd: api.resolve(defaultConfig.cordovaPath),
                env: process.env,
                stdio: 'inherit',
                encoding: 'utf-8'
            })
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
        // 在index.html中引入cordova.js
        api.chainWebpack(webpackConfig => {
            webpackConfig.plugin('cordova')
                .use(HtmlWebpackIncludeAssetsPlugin, [{
                    append: false,
                    scripts: 'cordova.js',
                    publicPath: false
                }])
        })
        // 执行 run build
        await api.service.run('build', {
            mode: args.mode,
            // dest: defaultConfig.cordovaPath + '/www'
            dest: 'dist'
        })
        const configUrl = api.resolve(args.config)
        const configCont = fs.readFileSync(configUrl, {encoding: 'utf-8'})
        const configFormatCont = JSON.parse(configCont)
        // 设置环境变量
        process.env.CORDOVA_SERVER_URL = configFormatCont[args.mode][args.platform].baseUrl
        process.env.CORDOVA_CONFIG_URL = api.resolve(`${defaultConfig.cordovaPath}/platforms/${args.platform}/app/src/main/res/xml/config.xml`)
        // 执行 cordova clean
        info(`执行 cordova clean ${args.platform}`)
        spawn.sync('cordova', ['clean', args.platform], {
            cwd: api.resolve(defaultConfig.cordovaPath),
            env: process.env,
            stdio: 'inherit',
            encoding: 'utf-8'
        })
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
                    "keystoreType": configFormatCont.development.android.keystoreType,
                    "packageType": configFormatCont.production.android.packageType
                }
            }
        }
        fs.writeFileSync(buildConfigUrl, JSON.stringify(buildConfigCont))
        const way = args.mode === 'development'? '--debug': '--release'
        info(`执行 cordova build ${args.platform}`)
        spawn.sync('cordova', [
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
