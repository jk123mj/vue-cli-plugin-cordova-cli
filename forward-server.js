const fs = require('fs')

let cordovaConfig = fs.readFileSync(process.env.C_CONFIG_URL, 'utf-8')
let lines = cordovaConfig.split(/\r?\n/g)
let contentIndex = lines.findIndex(v => v.test(/\s+<content/))
lines[contentIndex] = `    <content src="${process.env.BASE_URL}" />`
lines.splice(contentIndex + 1, 0, `    <allow-navigation href="${process.env.BASE_URL}" />`)
fs.writeFileSync(process.env.C_CONFIG_URL, lines.join('\n'))
