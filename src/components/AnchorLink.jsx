import { t } from '../lib/i18n.js'

export function AnchorLink({ id, section, lang }) {
  return (
    <a href={`#${id}`} className="anchor-link" aria-label={t(lang, 'anchor.linkTo', { section })}>
      #
    </a>
  )
}
