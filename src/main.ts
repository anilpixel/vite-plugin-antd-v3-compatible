import { transformFromAstSync } from '@babel/core'
import { parse } from '@babel/parser'
import traverse, { Node } from '@babel/traverse'
import { importDeclaration, importDefaultSpecifier, stringLiteral } from '@babel/types'
import { paramCase } from 'param-case'
import type { Plugin } from 'vite'

const SUFFIX = ['jsx', 'tsx', 'js', 'ts']

export const vitePluginAntdV3Compatible: () => Plugin = () => {
  return {
    name: 'vite-plugin-antd-v3-compatible',
    transform(code, file) {
      if (!/(node_modules)/.test(file) && SUFFIX.includes(file.split('.').slice(-1)[0])) {
        const ast = parse(code, {
          sourceType: 'module',
        })
        const modifyImports: Node[] = []

        traverse(ast, {
          ImportDeclaration(importPath) {
            if (importPath.node.source.value === 'antd') {
              importPath.node.specifiers.forEach((specifier) => {
                if (
                  specifier.type === 'ImportSpecifier' &&
                  specifier.imported.type === 'Identifier'
                ) {
                  const name = paramCase(specifier.imported.name)
                  const jsSource = stringLiteral(
                    `${importPath.node.source.value}/lib/${name}`,
                  )

                  modifyImports.push(
                    importDeclaration(
                      [importDefaultSpecifier(specifier.local)],
                      jsSource,
                    ),
                  )
                  const cssPath = `${importPath.node.source.value}/lib/${name}/style/index.less`
                  const cssSource = stringLiteral(cssPath)

                  modifyImports.push(importDeclaration([], cssSource))
                }
              })

              importPath.replaceWithMultiple(modifyImports)
            }
          },
        })

        const nextCode = transformFromAstSync(ast)?.code

        if (modifyImports.length > 0 && nextCode != null) {
          return {
            code: nextCode,
            map: this.getCombinedSourcemap && this.getCombinedSourcemap(),
          }
        }
      }

      return {
        code,
        map: null,
      }
    },
  }
}
