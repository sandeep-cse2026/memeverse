type Props = {
  active: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
  label?: string
}

export default function FavoriteButton({ active, onToggle, size = 'md', label }: Props) {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const padding = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const a11y = label ?? (active ? 'Remove from favorites' : 'Add to favorites')
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={active}
      aria-label={a11y}
      title={a11y}
      className={`btn-ghost ${padding} px-0 ${active ? 'text-rose-500 dark:text-rose-400' : ''}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={dim}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
