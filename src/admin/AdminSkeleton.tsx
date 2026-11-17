export function AdminSkeleton({ rows = 4 }: { readonly rows?: number }) {
  return (
    <div className="admin-skeleton" role="status" aria-label="불러오는 중입니다">
      {Array.from({ length: rows }, (_, index) => (
        <div className="admin-skeleton-row" key={index}>
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
