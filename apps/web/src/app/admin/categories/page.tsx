import { requireSystemPerm } from "@/server/auth/session";
import { adminCategories, CATEGORY_IMAGES } from "@/server/queries/admin";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/ui/layout-bits";

export const metadata = { title: "Quản lý thể loại" };

export default async function AdminCategoriesPage() {
  await requireSystemPerm("admin.category.manage", "/admin/categories");
  const categories = adminCategories();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Danh mục dự án · FR34"
        title="Quản lý thể loại"
        description="Thêm mới, sửa tên/mô tả/màu sắc/ảnh 3D và bật hoặc tạm ẩn thể loại hiển thị trên trang chủ và bộ lọc khám phá."
      />

      <CategoryManager categories={categories} presetImages={CATEGORY_IMAGES} />
    </div>
  );
}
