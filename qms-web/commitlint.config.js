export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修复
        'docs', // 文档
        'style', // 代码格式
        'refactor', // 重构
        'perf', // 性能优化
        'test', // 测试
        'build', // 构建
        'ci', // CI 配置
        'chore', // 杂务
        'revert', // 回退
      ],
    ],
    'subject-case': [0],
  },
}
