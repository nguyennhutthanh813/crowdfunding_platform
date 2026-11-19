"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-4 text-center font-sans text-white">
        <h1 className="text-2xl font-black">Kết nối tới máy chủ tạm thời gián đoạn</h1>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Vui lòng kiểm tra máy chủ Backend API đã khởi chạy hoặc bấm tải lại trang sau giây lát.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
        >
          Tải lại trang
        </button>
      </body>
    </html>
  );
}
