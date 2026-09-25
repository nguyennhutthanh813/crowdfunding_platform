import { PaginationQueryDto } from '../dto';

/**
 * Build Prisma pagination args (skip, take, orderBy) from PaginationQueryDto.
 */
export function buildPaginationArgs(query: PaginationQueryDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  return {
    skip: (page - 1) * limit,
    take: limit,
    orderBy: query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'desc' }
      : undefined,
  };
}

/**
 * Build a paginated response shape from query + total count + data.
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  query: PaginationQueryDto,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
