module.exports = {
    types: [
        {value: 'feat',     name: '特性:    一个新的特性'},
        {value: 'fix',      name: '修复:    修复一个Bug'},
        {value: 'docs',     name: '文档:    变更的只有文档'},
        {value: 'style',    name: '格式:    不影响代码含义的修改(空格, 分号等格式修复)'},
        {value: 'refactor', name: '重构:    代码重构，注意和特性、修复区分开'},
        {value: 'perf',     name: '性能:    提升性能'},
        {value: 'test',     name: '测试:    添加一个测试'}
    ],
    scopes: [
        {name: 'pages'},
        {name: 'router'},
        {name: 'config'},
        {name: 'assets'}
    ],
    skipQuestions: [
        'body',
        'breaking',
        'footer'
    ]
}
