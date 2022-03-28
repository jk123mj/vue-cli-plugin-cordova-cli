const spawn = require('cross-spawn')
const fs = require('fs')
const { info, error } = require('@vue/cli-shared-utils')
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin')
const defaultConfig = require('./default')

module.exports = (api, options) => {
    const cordovaPath = options.pluginOptions.cordovaPath || defaultConfig.cordovaPath
    const runServe = async (args) => {
        let platforms = []
        defaultConfig.platforms.forEach(v=>{
            if(fs.existsSync(api.resolve(`${cordovaPath}/platforms/${v}`))){
                platforms.push(v)
            }
        })
        if(platforms.includes(args.platform)){
            // 在index.html中引入cordova.js
            api.chainWebpack(webpackConfig=>{
                webpackConfig.plugin('cordova')
                    .use(HtmlWebpackIncludeAssetsPlugin, [{
                        append: false,
                        scripts: 'cordova.js',
                        publicPath: false
                    }])
            })
            // devServe添加指定路由器
            api.configureDevServer(app=>{
                app.get('/cordova.js', (req,res)=>{
                    const _path = `${cordovaPath}/platforms/${args.platform}/platform_www/cordova.js`
                    if(fs.readFileSync(_path)){
                        const fileContent = fs.readFileSync(_path, {encoding:'utf-8'})
                        res.send(fileContent)
                    }
                })
            })
            // todo 执行 serve
            // todo 执行 cordova clean
            // todo 执行 cordova run
        } else {
            error(`未发现${args.platform},请执行 cordova platform add ${args.platform}`)
        }
    }
    api.registerCommand('cordova-serve', async args => {
        return await runServe(args)
    })
}
