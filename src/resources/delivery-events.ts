import { HttpClient } from '../utils';
import type {
  DeliveryEvent,
  CreateDeliveryEventRequest,
  PodUploadToken,
} from '../types';

/**
 * DeliveryEvents resource for managing delivery events and POD uploads
 */
export class DeliveryEvents {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a delivery event
   *
   * @param data - Event creation data
   * @returns Created delivery event
   *
   * @example
   * ```typescript
   * const event = await client.deliveryEvents.create({
   *   waybill_id: 'waybill-uuid',
   *   event_type: 'delivered',
   *   notes: 'Left at front door',
   *   photos: ['base64-encoded-image...']
   * });
   * ```
   */
  async create(data: CreateDeliveryEventRequest): Promise<DeliveryEvent> {
    return this.http.post<DeliveryEvent>('/delivery-events', data as unknown as Record<string, unknown>);
  }

  /**
   * Upload POD images for a delivery event via multipart form data
   *
   * Note: This method accepts File or Blob objects for browser/Node.js environments.
   * For Node.js, you can use the `File` or `Blob` class from `node:buffer`.
   *
   * @param eventId - Delivery event ID
   * @param photos - Array of File or Blob objects
   * @returns Upload result
   *
   * @example
   * ```typescript
   * // Node.js
   * import { readFileSync } from 'fs';
   * const photoBuffer = readFileSync('photo.jpg');
   * const blob = new Blob([photoBuffer], { type: 'image/jpeg' });
   *
   * await client.deliveryEvents.uploadPods('event-uuid', [blob]);
   * ```
   */
  async uploadPods(eventId: string, photos: Blob[]): Promise<Record<string, unknown>> {
    const formData = new FormData();
    photos.forEach((photo, index) => {
      formData.append('photos[]', photo, `photo-${index}`);
    });

    const baseUrl = (this.http as unknown as { baseUrl: string }).baseUrl;
    const headers = (this.http as unknown as { headers: Record<string, string> }).headers;

    const response = await fetch(
      `${baseUrl}/delivery-events/${encodeURIComponent(eventId)}/pods`,
      {
        method: 'POST',
        headers: { ...headers },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json() as Record<string, unknown>;
      throw new Error((error.error as string) ?? 'Failed to upload PODs');
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  /**
   * Get a temporary Aliyun STS credential to upload POD photos for an event
   * straight to OSS. It can only write objects under `prefix`, for 15 minutes.
   * Upload with it, then call {@link attachPods} with the keys. `mode: "server"`
   * means OSS isn't configured: use {@link uploadPods} instead.
   *
   * @param eventId - Delivery event ID
   */
  async getPodUploadToken(eventId: string): Promise<PodUploadToken> {
    return this.http.post<PodUploadToken>(
      `/delivery-events/${encodeURIComponent(eventId)}/pods/upload-token`,
      {}
    );
  }

  /**
   * Attach POD photos already uploaded to OSS with a token from
   * {@link getPodUploadToken}.
   *
   * @param eventId - Delivery event ID
   * @param keys - 1 to 10 object keys, each under the token's prefix
   */
  async attachPods(eventId: string, keys: string[]): Promise<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `/delivery-events/${encodeURIComponent(eventId)}/pods`,
      { keys }
    );
  }

  /**
   * Delete a POD image from a delivery event
   *
   * @param eventId - Delivery event ID
   * @param imageUrl - The image URL to delete (URL-encoded)
   *
   * @example
   * ```typescript
   * await client.deliveryEvents.deletePod('event-uuid', 'https://storage.example.com/pods/photo.jpg');
   * ```
   */
  async deletePod(eventId: string, imageUrl: string): Promise<void> {
    await this.http.delete(
      `/delivery-events/${encodeURIComponent(eventId)}/pods/${encodeURIComponent(imageUrl)}`
    );
  }
}
