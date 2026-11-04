export default function Loading() {
  return (
    <div className="container-shell py-20" aria-label="Đang tải">
      <div className="h-4 w-36 rounded-full shimmer-line" />
      <div className="mt-5 h-12 max-w-2xl rounded-2xl shimmer-line" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-80 rounded-[26px] shimmer-line" />
        ))}
      </div>
    </div>
  );
}
