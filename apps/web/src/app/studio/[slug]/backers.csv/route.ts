import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db";
import { getViewer } from "@/server/auth/session";
import { canProject } from "@/server/rbac/rbac";
import { getStudioProject, listBackers } from "@/server/queries/studio";
import { formatDate } from "@/lib/utils";

function csvCell(val: unknown): string {
  const s = String(val ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const viewer = await getViewer();
  if (!viewer) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { slug } = await ctx.params;
  const project = getStudioProject(slug);
  if (!project) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!canProject(getDb(), viewer, project.id, "backer.view")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const backers = listBackers(project.id);
  const headers = [
    "Mã pledge",
    "Backer",
    "Username",
    "Ẩn danh",
    "Mức quà",
    "Add-ons",
    "Tiền quà (VND)",
    "Thưởng thêm (VND)",
    "Phí add-on (VND)",
    "Phí ship (VND)",
    "Tổng cộng (VND)",
    "Trạng thái",
    "Ngày góp",
    "Người nhận",
    "Số điện thoại",
    "Địa chỉ",
    "Tỉnh / TP",
    "Quốc gia",
    "Ghi chú",
  ];

  const rows = backers.map((b) =>
    [
      b.code,
      b.name,
      b.username,
      b.is_anonymous ? "Có" : "Không",
      b.tier ?? "Không nhận quà",
      b.add_ons ?? "",
      b.reward_amount,
      b.bonus_amount,
      b.add_on_amount,
      b.shipping_amount,
      b.total_amount,
      b.status,
      formatDate(b.created_at, true),
      b.ship_recipient ?? "",
      b.ship_phone ?? "",
      b.ship_address ?? "",
      b.ship_province ?? "",
      b.country_code,
      b.note,
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = "\uFEFF" + [headers.map(csvCell).join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${project.slug}-backers.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
