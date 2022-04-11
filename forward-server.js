const fs = require('fs')

let cordovaConfig = fs.readFileSync(process.env.CORDOVA_CONFIG_URL, 'utf-8')
let lines = cordovaConfig.split(/\r?\n/g)
let widgetIndex = lines.findIndex(v=>/\s*<widget/.test(v))
lines[widgetIndex] = updateWidgetRow(lines[widgetIndex])
let contentIndex = lines.findIndex(v => /\s*<content/.test(v))
lines[contentIndex] = `    <content src="${process.env.CORDOVA_SERVER_URL}" />`
if (/^http(s)?:\/\//.test(process.env.CORDOVA_SERVER_URL)) {
    lines.splice(contentIndex + 1, 0, `    <allow-navigation href="${process.env.CORDOVA_SERVER_URL}" />`)
}
fs.writeFileSync(process.env.CORDOVA_CONFIG_URL, lines.join('\n'))

function updateWidgetRow(row) {
    let part = row.replace(/<widget\s*(.+)\s*>/, '$1')
    let obj = {}
    part.split(/\s+/).forEach(v=>{
        if(/(.+)=(?:"|')(.+)(?:"|')/.test(v)){
            obj[RegExp.$1]=RegExp.$2
        }
    })
    obj.id = obj.id + process.env.CORDOVA_APP_ID_SUFFIX

    let r = '<widget'

    for(let i in obj){
        if(obj.hasOwnProperty(i)){
            r+= ` ${i}="${obj[i]}"`
        }
    }
    r+='>'
    return r
}
