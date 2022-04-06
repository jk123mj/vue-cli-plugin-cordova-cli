const fs = require('fs')

let cordovaConfig = fs.readFileSync(process.env.CORDOVA_CONFIG_URL, 'utf-8')
let lines = cordovaConfig.split(/\r?\n/g)
let contentIndex = lines.findIndex(v => /\s+<content/.test(v))
lines[contentIndex] = `    <content src="${process.env.CORDOVA_SERVER_URL}" />`
lines.splice(contentIndex + 1, 0, `    <allow-navigation href="${process.env.CORDOVA_SERVER_URL}" />`)
fs.writeFileSync(process.env.C_CONFIG_URL, lines.join('\n'))
