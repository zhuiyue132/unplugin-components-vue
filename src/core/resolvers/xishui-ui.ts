import { compare } from 'compare-versions'
import type { ComponentInfo, ComponentResolver, SideEffectsInfo } from '../../types'
import { getPkgVersion, kebabCase } from '../utils'

export interface XishuiUiResolverOptions {
  /**
   * import style css or sass with components
   *
   * @default 'css'
   */
  importStyle?: boolean | 'css' | 'sass'

  /**
   * use commonjs lib & source css or scss for ssr
   */
  ssr?: boolean

  /**
   * specify element-plus version to load style
   *
   * @default installed version
   */
  version?: string

  /**
   * auto import for directives
   *
   * @default true
   */
  directives?: boolean

  /**
   * exclude component name, if match do not resolve the name
   */
  exclude?: RegExp

  /**
   * a list of component names that have no styles, so resolving their styles file should be prevented
   */
  noStylesComponents?: string[]
}

type XishuiUiResolverOptionsResolved = Required<Omit<XishuiUiResolverOptions, 'exclude'>> &
Pick<XishuiUiResolverOptions, 'exclude'>

/**
 * @deprecated
 * @param partialName
 * @param options
 *
 * @returns
 */
function getSideEffectsLegacy(
  partialName: string,
  options: XishuiUiResolverOptionsResolved,
): SideEffectsInfo | undefined {
  const { importStyle } = options
  if (!importStyle)
    return

  if (importStyle === 'sass') {
    return [
      'xishui-ui/packages/theme-chalk/src/base.scss',
      `xishui-ui/packages/theme-chalk/src/${partialName}.scss`,
    ]
  }
  else if (importStyle === true || importStyle === 'css') {
    return [
      'xishui-ui/lib/theme-chalk/base.css',
      `xishui-ui/lib/theme-chalk/xs-${partialName}.css`,
    ]
  }
}

function getSideEffects(dirName: string, options: XishuiUiResolverOptionsResolved): SideEffectsInfo | undefined {
  const { importStyle, ssr } = options
  const themeFolder = 'xishui-ui/theme-chalk'
  const esComponentsFolder = 'xishui-ui/es/packages/components'

  if (importStyle === 'sass')
    return ssr ? `${themeFolder}/src/${dirName}.scss` : `${esComponentsFolder}/${dirName}/style/index`
  else if (importStyle === true || importStyle === 'css')
    return ssr ? `${themeFolder}/el-${dirName}.css` : `${esComponentsFolder}/${dirName}/style/css`
}

function resolveComponent(name: string, options: XishuiUiResolverOptionsResolved): ComponentInfo | undefined {
  if (options.exclude && name.match(options.exclude))
    return

  if (!name.match(/^Xs[A-Z]/))
    return

  const partialName = kebabCase(name.slice(2))// ElTableColumn -> table-column
  const { version, ssr } = options

  // >=1.1.0-beta.1
  if (compare(version, '1.0.7-beta.10', '>=')) {
    return {
      name,
      from: `xishui-ui/${ssr ? 'lib' : 'es'}`,
      sideEffects: getSideEffects(partialName, options),
    }
  }
}

function resolveDirective(name: string, options: XishuiUiResolverOptionsResolved): ComponentInfo | undefined {
  if (!options.directives)
    return

  const directives: Record<string, { importName: string; styleName: string }> = {
   
  }

  const directive = directives[name]
  if (!directive)
    return

  const { version, ssr } = options

  // >=1.1.0-beta.1
  if (compare(version, '1.1.0-beta.1', '>=')) {
    return {
      name: directive.importName,
      from: `xishui-ui/${ssr ? 'lib' : 'es'}`,
      sideEffects: getSideEffects(directive.styleName, options),
    }
  }
}

const noStylesComponents = ['XsFocusTrap']

/**
 * Resolver for Element Plus
 *
 * See https://github.com/antfu/vite-plugin-components/pull/28 for more details
 * See https://github.com/antfu/vite-plugin-components/issues/117 for more details
 *
 * @author @develar @nabaonan @sxzz
 * @link https://element-plus.org/ for element-plus
 *
 */
export function XishuiUiResolver(
  options: XishuiUiResolverOptions = {},
): ComponentResolver[] {
  let optionsResolved: XishuiUiResolverOptionsResolved

  async function resolveOptions() {
    if (optionsResolved)
      return optionsResolved
    optionsResolved = {
      ssr: false,
      version: await getPkgVersion('xishui-ui', '1.0.7-beta.10'),
      importStyle: 'css',
      directives: true,
      exclude: undefined,
      noStylesComponents: options.noStylesComponents || [],
      ...options,
    }
    return optionsResolved
  }

  return [
    {
      type: 'component',
      resolve: async (name: string) => {
        const options = await resolveOptions()

        if ([...options.noStylesComponents, ...noStylesComponents].includes(name))
          return resolveComponent(name, { ...options, importStyle: false })
        else return resolveComponent(name, options)
      },
    }
  ]
}
