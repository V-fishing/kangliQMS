// eslint-plugin-qms-terminology/index.js
// QMS UI 术语检查 - 禁止 UI 文案出现技术黑话（SRS GLB/CI 术语通俗化）
// 详见技术栈文档 §18

const FORBIDDEN = [
  'CRUD',
  'DTO',
  'VO',
  'POJO',
  'ORM',
  'JPA',
  'RPC',
  'SKU',
  'SPU',
  'UUID',
  'DAO',
  'BO',
  'PO',
  'BFF',
  'ORM',
  'ORM',
]

function checkValue(context, node, value) {
  if (typeof value !== 'string') return
  FORBIDDEN.forEach((term) => {
    // 排除注释和代码标识符（只检查字符串字面量和模板）
    const regex = new RegExp(`\\b${term}\\b`)
    if (regex.test(value)) {
      context.report({
        node,
        messageId: 'forbidden',
        data: { term },
      })
    }
  })
}

export default {
  rules: {
    'no-forbidden-term': {
      meta: {
        type: 'problem',
        docs: {
          description: '禁止 UI 文案出现技术术语缩写（CRUD/DTO/VO 等）',
        },
        schema: [],
        messages: {
          forbidden: 'UI 文案禁止出现技术术语: {{term}}（请使用行业通用中文）',
        },
      },
      create(context) {
        return {
          Literal(node) {
            checkValue(context, node, node.value)
          },
          VLiteral(node) {
            checkValue(context, node, node.value?.value)
          },
          TemplateElement(node) {
            checkValue(context, node, node.value?.raw)
          },
        }
      },
    },
  },
}
