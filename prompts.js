const defaultConfig = require('./default')

module.exports = [
    {
        name: 'id',
        type: 'string',
        message: '指定app id',
        default: defaultConfig.id,
        validate: opt => opt && opt.trim().length
    },
    {
        name: 'appName',
        type: 'string',
        message: '指定app Name',
        default: defaultConfig.appName,
        validate: opt => opt && opt.trim().length
    },
    {
        name: 'platforms',
        type: 'checkbox',
        message: '指定平台:',
        choices: [
            {
                name: 'Android',
                value: 'android'
            },
            {
                name: 'iOS',
                value: 'ios'
            }
        ]
    }
]
