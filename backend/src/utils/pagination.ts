export interface PaginationQuery {
	page?: number;
	limit?: number;
}

export interface PaginationConfig {
	defaultPage?: number;
	defaultLimit?: number;
	maxLimit?: number;
}

export interface NormalizedPagination {
	page: number;
	limit: number;
	skip: number;
}

export interface PaginationMeta {
	page: number;
	limit: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export const normalizePagination = (
	query: PaginationQuery,
	config: PaginationConfig = {},
): NormalizedPagination => {
	const defaultPage = config.defaultPage ?? 1;
	const defaultLimit = config.defaultLimit ?? 10;
	const maxLimit = config.maxLimit ?? 50;

	const pageCandidate = Number(query.page);
	const limitCandidate = Number(query.limit);

	const page = Number.isInteger(pageCandidate) && pageCandidate > 0 ? pageCandidate : defaultPage;
	const limit =
		Number.isInteger(limitCandidate) && limitCandidate > 0
			? Math.min(limitCandidate, maxLimit)
			: defaultLimit;

	return {
		page,
		limit,
		skip: (page - 1) * limit,
	};
};

export const buildPaginationMeta = (
	totalItems: number,
	pagination: Pick<NormalizedPagination, 'page' | 'limit'>,
): PaginationMeta => {
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pagination.limit);

	return {
		page: pagination.page,
		limit: pagination.limit,
		totalItems,
		totalPages,
		hasNextPage: pagination.page < totalPages,
		hasPrevPage: pagination.page > 1 && totalPages > 0,
	};
};

