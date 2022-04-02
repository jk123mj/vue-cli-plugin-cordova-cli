const spawn = require('cross-spawn')
const fs = require('fs')
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
            // todo ios缺少路径
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
            dest: defaultConfig.cordovaPath + '/www'
        })
        // 设置环境变量
        const configCont = fs.readFileSync(args.config, {encoding: 'utf-8'})
        const configFormatCont = JSON.parse(configCont)
        process.env.CORDOVA_SERVER_URL = configFormatCont[args.mode][args.platform].baseUrl
        // todo ios缺少路径
        process.env.CORDOVA_CONFIG_URL = api.resolve(`${defaultConfig.cordovaPath}/platforms/${args.platform}/app/src/main/res/xml/config.xml`)
        // 执行 cordova clean
        info(`执行 cordova clean ${args.platform}`)
        spawn.sync('cordova', ['clean', args.platform], {
            cwd: api.resolve(defaultConfig.cordovaPath),
            env: process.env,
            stdio: 'inherit',
            encoding: 'utf-8'
        })
        // todo 生产和测试区分
        // 执行 cordova build
        info(`执行 cordova build ${args.platform}`)
        spawn.sync('cordova', [
            'build',
            args.platform
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
