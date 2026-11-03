import DOMPurify from 'dompurify'

/**
 * 消毒外部来源的 HTML（如 Spigot 插件描述）。
 * 仅保留安全 HTML，移除脚本、表单、内嵌框架等可执行/可交互内容。
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['form', 'input', 'button', 'select', 'textarea', 'iframe', 'object', 'embed', 'base', 'meta', 'link'],
    FORBID_ATTR: ['srcdoc'],
  })
}
