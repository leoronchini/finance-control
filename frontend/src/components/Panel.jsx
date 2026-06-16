export default function Panel({ title, children, style, noPad }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: noPad ? 0 : 20, overflow: noPad ? 'hidden' : undefined,
      ...style,
    }}>
      {title && (
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16,
          padding: noPad ? '20px 20px 0' : undefined,
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}
