import { catClass, catIcon, catHasCustomIcon } from '../lib/constants.js'
import { useLang } from '../lib/lang.jsx'

// 분류 배지: 색상 + 아이콘 + 현지화 라벨
export default function CatBadge({ cat, style }) {
  const { tc } = useLang()
  return (
    <span className={'badge ' + catClass(cat)} style={style}>
      {catHasCustomIcon(cat)
        ? <span className={'cat-ic ci-' + cat} aria-hidden="true" />
        : <span className="material-symbols-outlined">{catIcon(cat)}</span>}
      {tc(cat)}
    </span>
  )
}
