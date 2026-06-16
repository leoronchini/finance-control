export function SkeletonBlock({ height = 60, style }) {
  return (
    <div style={{
      height, borderRadius: 8,
      background: 'linear-gradient(90deg, var(--bg3) 25%, var(--border) 50%, var(--bg3) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  )
}

export function SkeletonCards() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <SkeletonBlock height={12} style={{ width: '40%', marginBottom: 12 }} />
          <SkeletonBlock height={28} style={{ width: '70%' }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonRows({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16 }}>
          <SkeletonBlock height={12} style={{ width: 80 }} />
          <SkeletonBlock height={12} style={{ width: 40 }} />
          <SkeletonBlock height={12} style={{ width: 50 }} />
          <SkeletonBlock height={12} style={{ flex: 1 }} />
          <SkeletonBlock height={12} style={{ width: 80 }} />
        </div>
      ))}
    </div>
  )
}

// injeta o keyframe uma vez no documento
if (typeof document !== 'undefined' && !document.getElementById('skeleton-style')) {
  const s = document.createElement('style')
  s.id = 'skeleton-style'
  s.textContent = '@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }'
  document.head.appendChild(s)
}
