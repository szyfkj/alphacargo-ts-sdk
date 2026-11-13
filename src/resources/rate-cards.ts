import { HttpClient } from '../utils';
import type {
  PaginatedResponse,
  RateCard,
  CreateRateCardRequest,
  UpdateRateCardRequest,
  ListRateCardsParams,
} from '../types';

/**
 * RateCards resource for managing rate cards
 */
export class RateCards {
  constructor(private readonly http: HttpClient) {}

  /**
   * List rate cards with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns A page of rate cards (`data`, `total`, `page`, …), newest first
   *
   * @example
   * ```typescript
   * const { data: rateCards } = await client.rateCards.list({
   *   service_id: 'service-uuid'
   * });
   * ```
   */
  async list(params?: ListRateCardsParams): Promise<PaginatedResponse<RateCard>> {
    return this.http.get<PaginatedResponse<RateCard>>('/rate-cards', params as Record<string, unknown>);
  }

  /**
   * Get a single rate card by ID
   *
   * @param id - Rate card ID
   * @returns Rate card details
   *
   * @example
   * ```typescript
   * const rateCard = await client.rateCards.get('rate-card-uuid');
   * console.log(rateCard.unit_price); // 50.00
   * ```
   */
  async get(id: string): Promise<RateCard> {
    return this.http.get<RateCard>(`/rate-cards/${encodeURIComponent(id)}`);
  }

  /**
   * Create a new rate card
   *
   * @param data - Rate card creation data
   * @returns Created rate card
   *
   * @example
   * ```typescript
   * const rateCard = await client.rateCards.create({
   *   name: 'Express Delivery',
   *   unit_price: 75.00,
   *   service_id: 'service-uuid',
   *   description: 'Same-day delivery rate'
   * });
   * ```
   */
  async create(data: CreateRateCardRequest): Promise<RateCard> {
    return this.http.post<RateCard>('/rate-cards', data as unknown as Record<string, unknown>);
  }

  /**
   * Update a rate card
   *
   * @param id - Rate card ID
   * @param data - Fields to update
   * @returns Updated rate card
   *
   * @example
   * ```typescript
   * await client.rateCards.update('rate-card-uuid', {
   *   unit_price: 80.00,
   *   name: 'Premium Express Delivery'
   * });
   * ```
   */
  async update(id: string, data: UpdateRateCardRequest): Promise<RateCard> {
    return this.http.patch<RateCard>(`/rate-cards/${encodeURIComponent(id)}`, data as unknown as Record<string, unknown>);
  }

  /**
   * Delete a rate card
   *
   * @param id - Rate card ID
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/rate-cards/${encodeURIComponent(id)}`);
  }
}
