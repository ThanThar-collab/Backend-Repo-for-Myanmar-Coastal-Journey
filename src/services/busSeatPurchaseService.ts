import { BusSeatPurchase } from '../models/busSeatPurchaseModel';
import type { PaginationQuery } from '../validations/commonSchema';

export const listBusSeatPurchasesForUserService = async (
  userId: string,
  pagination: PaginationQuery
) => {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const filter = { user: userId };
  const [data, total] = await Promise.all([
    BusSeatPurchase.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    BusSeatPurchase.countDocuments(filter),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
