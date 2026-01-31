import { elegantAPI } from './elegant-api';
import { apiRateLimiter } from './api-rate-limiter';

const ADMIN_BASE_URL = 'https://api.elegant.admin.wimsup.com';
const POSTMARK_BASE_URL = 'https://api.elegant.postmark.wimsup.com';

// Global cache for item types
let itemTypesCache: string[] | null = null;
let itemTypesCachePromise: Promise<string[]> | null = null;

class AdminAPI {
  private async getAuthToken(): Promise<string> {
    let token = elegantAPI.getToken();
    if (!token) {
      token = await elegantAPI.authenticate();
    }
    return token;
  }

  private async getHeaders(clerkUserId?: string): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Include Clerk user ID for authenticated requests
    const userId = clerkUserId || elegantAPI.getClerkUserId();
    if (userId) {
      headers['X-Elegant-Userid'] = userId;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & { headers?: Record<string, string> } = {},
    clerkUserId?: string,
    rateLimitOptions?: { priority?: number; bypassQueue?: boolean }
  ): Promise<T> {
    // Ensure user is authenticated
    if (!clerkUserId) {
      const authError = new Error('Authentication required. Please sign in to access admin features.');
      (authError as any).code = 'AUTH_REQUIRED';
      throw authError;
    }

    const headers = await this.getHeaders();

    // Create a deduplication key based on endpoint and method
    const method = options.method || 'GET';
    const dedupeKey = `admin:${method}:${endpoint}`;

    // Use rate limiter for the actual request
    return apiRateLimiter.enqueue(
      async () => {
        const response = await fetch(`${ADMIN_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            ...headers,
            ...options.headers,
          },
        });

        if (response.status === 401 || response.status === 403) {
          // Unauthorized - user needs to authenticate
          const authError = new Error('Authentication required. Please sign in to access admin features.');
          (authError as any).code = 'AUTH_REQUIRED';
          throw authError;
        }

        if (response.status === 429) {
          const error = new Error(`Rate limit exceeded: ${response.status}`);
          (error as any).status = 429;
          throw error;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Admin API error:', {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Admin API request failed (${response.status}): ${errorText || response.statusText}`);
        }

        return await response.json();
      },
      {
        key: method === 'GET' ? dedupeKey : undefined, // Only dedupe GET requests
        priority: rateLimitOptions?.priority,
        bypassQueue: rateLimitOptions?.bypassQueue,
      }
    );
  }

  async get<T>(endpoint: string, clerkUserId: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, clerkUserId);
  }

  async post<T>(endpoint: string, data: any, clerkUserId: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, clerkUserId);
  }

  async put<T>(endpoint: string, data: any, clerkUserId: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, clerkUserId);
  }

  async patch<T>(endpoint: string, data: any, clerkUserId: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, clerkUserId);
  }

  async delete<T>(endpoint: string, clerkUserId: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, clerkUserId);
  }

  async getDashboardAnalytics(clerkUserId: string, startDate?: number, endDate?: number): Promise<DashboardAnalyticsResponse> {
    let endpoint = '/dashboard/get_analytics';
    const params: string[] = [];

    if (startDate) {
      params.push(`start_date=${startDate}`);
    }
    if (endDate) {
      params.push(`end_date=${endDate}`);
    }

    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    return this.get<DashboardAnalyticsResponse>(endpoint, clerkUserId);
  }

  async getItem(clerkUserId: string, itemId: number): Promise<any> {
    return this.get<any>(`/items/${itemId}`, clerkUserId);
  }

  async getItems(
    clerkUserId: string,
    page: number = 1,
    perPage: number = 25,
    itemType?: string,
    customersId?: string,
    search?: string
  ): Promise<ItemsResponse> {
    // Xano expects pagination as external JSON object
    const externalParams: any = {
      page: page,
      PerPage: perPage
    };

    // Build the endpoint with external parameter as JSON string
    let endpoint = `/items_all?external=${encodeURIComponent(JSON.stringify(externalParams))}`;

    // Add item_type filter if provided
    if (itemType) {
      endpoint += `&item_type=${itemType}`;
    }

    // Add customers_id filter for non-admin users to only see their own items
    if (customersId) {
      endpoint += `&customers_id=${customersId}`;
    }

    // Add search filter if provided
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }

    return this.get<ItemsResponse>(endpoint, clerkUserId);
  }

  // Fetch all valid item types from the API (raw, uncached)
  async getItemTypes(clerkUserId: string): Promise<ItemTypesResponse> {
    return this.get<ItemTypesResponse>('/Item_types', clerkUserId);
  }

  // Get cached item types (sorted alphabetically)
  async getCachedItemTypes(clerkUserId: string): Promise<string[]> {
    // Return from cache if available
    if (itemTypesCache) {
      return itemTypesCache;
    }

    // If a fetch is already in progress, wait for it
    if (itemTypesCachePromise) {
      return itemTypesCachePromise;
    }

    // Fetch and cache
    itemTypesCachePromise = this.getItemTypes(clerkUserId)
      .then(response => {
        const sortedTypes = [...response.values].sort((a, b) => a.localeCompare(b));
        itemTypesCache = sortedTypes;
        itemTypesCachePromise = null;
        return sortedTypes;
      })
      .catch(error => {
        itemTypesCachePromise = null;
        console.error('Failed to fetch item types:', error);
        // Return fallback types
        const fallback = [
          'Application', 'Blog', 'Campaign', 'Class', 'Donation',
          'Event', 'Membership', 'Newsletter', 'Product', 'Raffle',
          'Sponsor', 'Vendor'
        ];
        return fallback;
      });

    return itemTypesCachePromise;
  }

  // Clear item types cache (useful if types are updated)
  clearItemTypesCache(): void {
    itemTypesCache = null;
    itemTypesCachePromise = null;
  }

  async getItemById(itemId: number, clerkUserId: string): Promise<Item> {
    return this.get<Item>(`/items/${itemId}`, clerkUserId);
  }

  async createItem(itemData: CreateItemRequest, clerkUserId: string): Promise<CreateItemResponse> {
    return this.post<CreateItemResponse>('/items', itemData, clerkUserId);
  }

  async updateItem(itemId: number, itemData: Partial<CreateItemRequest>, clerkUserId: string): Promise<CreateItemResponse> {
    return this.patch<CreateItemResponse>(`/items/${itemId}`, itemData, clerkUserId);
  }

  async createItemImage(imageData: CreateItemImageRequest, clerkUserId: string): Promise<void> {
    return this.post<void>('/item_images', imageData, clerkUserId);
  }

  async uploadImage(file: File, itemsType: 'Image' | 'Video' | 'YouTube', sequence: number, clerkUserId: string): Promise<ImageUploadResponse> {
    const token = await this.getAuthToken();

    // Validate file has an extension
    if (!file.name || !file.name.includes('.')) {
      throw new Error('File must have a valid extension (e.g., .jpg, .png, .mp4)');
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];

    if (itemsType === 'Image' && !validImageTypes.includes(file.type)) {
      throw new Error('Invalid image file type. Please upload JPG, PNG, GIF, or WebP');
    }

    if (itemsType === 'Video' && !validVideoTypes.includes(file.type)) {
      throw new Error('Invalid video file type. Please upload MP4, MOV, AVI, or MPEG');
    }

    const formData = new FormData();
    formData.append('file', file, file.name); // Explicitly include filename
    formData.append('image_type', itemsType);
    formData.append('seq', sequence.toString());

    try {
      const response = await fetch(`${ADMIN_BASE_URL}/image_upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Elegant-Userid': clerkUserId,
          // Note: Don't set Content-Type for FormData - browser sets it automatically with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Image upload failed (${response.status}): ${errorText || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async uploadYouTubeUrl(url: string, clerkUserId: string): Promise<ImageUploadResponse> {
    const token = await this.getAuthToken();

    const response = await fetch(`${ADMIN_BASE_URL}/image_upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Elegant-Userid': clerkUserId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_type: 'YouTube',
        url: url,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube URL upload error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`YouTube URL upload failed (${response.status}): ${errorText || response.statusText}`);
    }

    return await response.json();
  }

  async deleteImage(mediafilesId: string, clerkUserId: string): Promise<void> {
    return this.delete(`/image/${mediafilesId}`, clerkUserId);
  }

  async getMediaFiles(clerkUserId: string, page: number = 1, perPage: number = 12): Promise<MediaFilesResponse> {
    const externalParams = {
      page: page,
      PerPage: perPage
    };
    const endpoint = `/mediafiles?external=${encodeURIComponent(JSON.stringify(externalParams))}`;
    return this.get<MediaFilesResponse>(endpoint, clerkUserId);
  }

  async getItemImages(clerkUserId: string, itemsId?: string): Promise<ItemImagesResponse> {
    const endpoint = itemsId ? `/item_images?items_id=${itemsId}` : '/item_images';
    return this.get<ItemImagesResponse>(endpoint, clerkUserId);
  }

  async updateMediaFile(mediafilesId: string, data: UpdateMediaFileRequest, clerkUserId: string): Promise<any> {
    return this.patch(`/mediafiles/${mediafilesId}`, data, clerkUserId);
  }

  async getShop(clerkUserId: string): Promise<AdminShopResponse> {
    return this.get<AdminShopResponse>('/shop', clerkUserId);
  }

  async updateShopInfo(clerkUserId: string, shopsSettings: Record<string, any>): Promise<any> {
    return this.patch('/shop_info', { shops_settings: shopsSettings }, clerkUserId);
  }

  async deleteItem(itemId: number, clerkUserId: string): Promise<void> {
    return this.delete(`/items/${itemId}`, clerkUserId);
  }

  async updateItemImage(imageId: number, data: { seq: number }, clerkUserId: string): Promise<void> {
    return this.patch(`/item_images/${imageId}`, data, clerkUserId);
  }

  async getAllCustomers(
    clerkUserId: string,
    page: number = 1,
    perPage: number = 25,
    options?: {
      search?: string;
      status?: string;
      role?: string;
    }
  ): Promise<CustomersResponse> {
    const externalParams = {
      page: page,
      PerPage: perPage
    };

    const params: string[] = [];
    params.push(`external=${encodeURIComponent(JSON.stringify(externalParams))}`);

    // Add search filter if provided
    if (options?.search) {
      params.push(`search=${encodeURIComponent(options.search)}`);
    }

    // Add status filter if provided
    if (options?.status && options.status !== 'all') {
      params.push(`status=${encodeURIComponent(options.status)}`);
    }

    // Add role filter if provided
    if (options?.role && options.role !== 'all') {
      params.push(`role=${encodeURIComponent(options.role)}`);
    }

    const endpoint = `/customers_all?${params.join('&')}`;
    return this.get<CustomersResponse>(endpoint, clerkUserId);
  }

  async updateCustomerInfo(customerId: string, data: UpdateCustomerInfoRequest, clerkUserId: string): Promise<void> {
    return this.patch(`/customer_info/${customerId}`, data, clerkUserId);
  }

  async updateFranchisorManager(franchisorId: number, customerId: string, clerkUserId: string): Promise<void> {
    return this.put(`/shops_franchisor_manager/${franchisorId}/${customerId}`, {}, clerkUserId);
  }

  async deleteFranchisorManager(franchisorId: number, customerId: string, clerkUserId: string): Promise<void> {
    return this.delete(`/shops_franchisor_manager/${franchisorId}/${customerId}`, clerkUserId);
  }

  async getLeads(
    clerkUserId: string,
    page: number = 1,
    perPage: number = 25,
    options?: { filter_new?: boolean; email?: string; status?: string }
  ): Promise<LeadsResponse> {
    const externalParams = {
      page: page,
      PerPage: perPage
    };

    const queryParams = new URLSearchParams();
    queryParams.set('external', JSON.stringify(externalParams));

    if (options?.filter_new !== undefined) {
      queryParams.set('filter_new', String(options.filter_new));
    }
    if (options?.email) {
      queryParams.set('email', options.email);
    }
    if (options?.status && options.status !== 'all') {
      queryParams.set('status', options.status);
    }

    const endpoint = `/leads?${queryParams.toString()}`;
    return this.get<LeadsResponse>(endpoint, clerkUserId);
  }

  async createLead(leadData: CreateLeadRequest, clerkUserId: string): Promise<Lead> {
    return this.post<Lead>('/leads', leadData, clerkUserId);
  }

  async updateLead(leadId: number, leadData: Partial<CreateLeadRequest>, clerkUserId: string): Promise<Lead> {
    return this.patch<Lead>(`/leads/${leadId}`, leadData, clerkUserId);
  }

  async deleteLead(leadId: number, clerkUserId: string): Promise<void> {
    return this.delete(`/leads/${leadId}`, clerkUserId);
  }

  async getOrders(
    clerkUserId: string,
    page: number = 1,
    perPage: number = 25,
    options?: {
      bookingType?: string;
      itemsType?: string;
      status?: string;
      search?: string;
      bookingSlug?: string;
      startDate?: string;
      endDate?: string;
      isDeleted?: boolean;
      checkoutType?: string;
      paymentStatus?: string;
    }
  ): Promise<OrdersResponse> {
    const params: string[] = [];

    // Build query parameters
    if (options?.bookingType && options.bookingType !== 'all') {
      params.push(`booking_type=${encodeURIComponent(options.bookingType)}`);
    }

    if (options?.itemsType && options.itemsType !== 'all') {
      params.push(`items_type=${encodeURIComponent(options.itemsType)}`);
    }

    if (options?.status && options.status !== 'all') {
      params.push(`status=${encodeURIComponent(options.status)}`);
    }

    if (options?.search) {
      params.push(`search=${encodeURIComponent(options.search)}`);
    }

    if (options?.bookingSlug) {
      params.push(`booking_slug=${encodeURIComponent(options.bookingSlug)}`);
    }

    if (options?.startDate) {
      params.push(`start_date=${encodeURIComponent(options.startDate)}`);
    }

    if (options?.endDate) {
      params.push(`end_date=${encodeURIComponent(options.endDate)}`);
    }

    if (options?.isDeleted !== undefined) {
      params.push(`is_deleted=${options.isDeleted}`);
    }

    if (options?.checkoutType && options.checkoutType !== 'all') {
      params.push(`checkout_type=${encodeURIComponent(options.checkoutType)}`);
    }

    if (options?.paymentStatus && options.paymentStatus !== 'all') {
      params.push(`payment_status=${encodeURIComponent(options.paymentStatus)}`);
    }

    // Add pagination as external JSON object
    const externalParams = {
      page: page,
      perPage: perPage
    };
    params.push(`external=${encodeURIComponent(JSON.stringify(externalParams))}`);

    const endpoint = `/applications${params.length > 0 ? '?' + params.join('&') : ''}`;
    return this.get<OrdersResponse>(endpoint, clerkUserId);
  }

  async getCustomerNotes(clerkUserId: string, customerId: string, page: number = 1, perPage: number = 25): Promise<CustomerNotesResponse> {
    const externalParams = {
      page: page,
      PerPage: perPage
    };

    const endpoint = `/customer_notes?customers_id=${customerId}&external=${encodeURIComponent(JSON.stringify(externalParams))}`;
    return this.get<CustomerNotesResponse>(endpoint, clerkUserId);
  }

  async createCustomerNote(noteData: CreateCustomerNoteRequest, clerkUserId: string): Promise<CustomerNote> {
    return this.post<CustomerNote>('/customer_notes', noteData, clerkUserId);
  }

  async updateCustomerNote(noteId: string, noteData: UpdateCustomerNoteRequest, clerkUserId: string): Promise<CustomerNote> {
    return this.patch<CustomerNote>(`/customer_notes/${noteId}`, noteData, clerkUserId);
  }

  async deleteCustomerNote(noteId: string, clerkUserId: string): Promise<void> {
    return this.delete(`/customer_notes/${noteId}`, clerkUserId);
  }

  async updateBooking(bookingId: number, bookingData: UpdateBookingRequest, clerkUserId: string): Promise<void> {
    return this.patch(`/bookings/${bookingId}`, bookingData, clerkUserId);
  }

  async deleteBooking(bookingsId: number, clerkUserId: string): Promise<void> {
    return this.request<void>('/bookings', {
      method: 'DELETE',
      body: JSON.stringify({ bookings_id: bookingsId }),
    }, clerkUserId);
  }

  async getLeadsCommunication(clerkUserId: string, email: string, page: number = 1, perPage: number = 25): Promise<LeadsCommunicationResponse> {
    const externalParams = {
      page: page,
      PerPage: perPage
    };

    const endpoint = `/leads_communication?email=${encodeURIComponent(email)}&external=${encodeURIComponent(JSON.stringify(externalParams))}`;
    return this.get<LeadsCommunicationResponse>(endpoint, clerkUserId);
  }

  async getAllCommunications(clerkUserId: string, page: number = 1, perPage: number = 25): Promise<LeadsCommunicationResponse> {
    const externalParams = {
      page: page,
      PerPage: perPage
    };

    const endpoint = `/leads_communication?external=${encodeURIComponent(JSON.stringify(externalParams))}`;
    return this.get<LeadsCommunicationResponse>(endpoint, clerkUserId);
  }

  async getBookingItemsByType(clerkUserId: string, itemType: string): Promise<BookingItemsResponse> {
    const endpoint = `/booking_items?item_type=${encodeURIComponent(itemType)}`;
    return this.get<BookingItemsResponse>(endpoint, clerkUserId);
  }

  async submitRaffleEntry(itemsId: number, clerkUserId: string): Promise<RaffleEntryResponse> {
    return this.post<RaffleEntryResponse>('/raffle', { items_id: itemsId }, clerkUserId);
  }

  async submitFreeRaffleEntry(
    itemsId: number,
    email: string,
    fullName: string,
    mobileNumber?: string,
    clerkUserId?: string
  ): Promise<RaffleEntryResponse> {
    const payload: { items_id: number; email: string; full_name: string; mobile_number?: string } = {
      items_id: itemsId,
      email,
      full_name: fullName,
    };
    if (mobileNumber) {
      payload.mobile_number = mobileNumber;
    }

    // For free raffle entries, we make a public request without requiring auth
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (clerkUserId) {
      headers['X-Elegant-Userid'] = clerkUserId;
    }

    const response = await fetch(`${ADMIN_BASE_URL}/raffle/entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit raffle entry: ${errorText || response.statusText}`);
    }

    return await response.json();
  }

  async getRaffleEntries(itemsId: number, clerkUserId: string, page: number = 1): Promise<RaffleEntriesResponse> {
    const externalParams = { page, per_page: 50, items_id: itemsId };
    const endpoint = `/raffle?external=${encodeURIComponent(JSON.stringify(externalParams))}`;
    return this.get<RaffleEntriesResponse>(endpoint, clerkUserId);
  }

  async getRaffleWinners(itemsId: number, clerkUserId: string, page: number = 1): Promise<RaffleEntriesResponse> {
    const externalParams = { page, per_page: 50, items_id: itemsId };
    const endpoint = `/raffle?is_winner=true&external=${encodeURIComponent(JSON.stringify(externalParams))}`;
    return this.get<RaffleEntriesResponse>(endpoint, clerkUserId);
  }

  async pickRaffleWinner(itemsId: number, clerkUserId: string): Promise<RaffleWinner> {
    return this.post<RaffleWinner>('/raffle/pick_winner', { items_id: itemsId }, clerkUserId);
  }

  // Vendor Applications API methods (uses /applications endpoint with booking_type=vendor)
  async getVendorApplications(
    clerkUserId: string,
    page: number = 1,
    perPage: number = 25,
    status?: string,
    search?: string
  ): Promise<OrdersResponse> {
    // Use the same pattern as getOrders but hardcode booking_type=vendor
    return this.getOrders(clerkUserId, page, perPage, {
      bookingType: 'vendor',
      status: status,
      search: search,
    });
  }

  // Get application/order details by slug
  async getApplicationDetails(slug: string, clerkUserId: string): Promise<Order> {
    return this.get<Order>(`/applications/${slug}`, clerkUserId);
  }

  // Update application payment information
  async updateApplicationPayment(
    bookingsSlug: string,
    data: {
      booking_payments_id: number;
      payment_id?: string;
      payment_response?: any;
      paid_amount?: number;
      payment_status?: string;
      payment_method?: string;
    },
    clerkUserId: string
  ): Promise<any> {
    return this.patch<any>(`/applications/payments/${bookingsSlug}`, data, clerkUserId);
  }

  // Campaign Leads API methods
  async getCampaignLeads(clerkUserId: string, itemsId: number, page: number = 1, perPage: number = 25, filterNew: boolean = true): Promise<CampaignLeadsResponse> {
    const externalParams = {
      page: page,
      PerPage: perPage
    };
    const endpoint = `/campaigns/leads/${itemsId}?filter_new=${filterNew}&external=${encodeURIComponent(JSON.stringify(externalParams))}`;
    return this.get<CampaignLeadsResponse>(endpoint, clerkUserId);
  }

  async getCampaignLeadDetail(campaignId: string, clerkUserId: string): Promise<CampaignLeadDetail> {
    return this.get<CampaignLeadDetail>(`/campaigns/${campaignId}`, clerkUserId);
  }

  async assignLeadToCampaign(itemsId: number, leadsId: number, clerkUserId: string): Promise<CampaignLead> {
    return this.post<CampaignLead>('/campaigns', { items_id: itemsId, leads_id: leadsId }, clerkUserId);
  }

  async deleteCampaignLead(campaignId: string, clerkUserId: string): Promise<void> {
    return this.request<void>(`/campaigns/${campaignId}`, {
      method: 'DELETE',
      body: JSON.stringify({ field_value: campaignId }),
    }, clerkUserId);
  }

  // Related Items API methods
  async getRelatedItems(itemsId: number, clerkUserId: string, page: number = 1, perPage: number = 25): Promise<RelatedItemsResponse> {
    const externalParams = {
      page: page,
      PerPage: perPage
    };
    const endpoint = `/related_items?items_id=${itemsId}&external=${encodeURIComponent(JSON.stringify(externalParams))}`;
    return this.get<RelatedItemsResponse>(endpoint, clerkUserId);
  }

  async createRelatedItem(data: CreateRelatedItemRequest, clerkUserId: string): Promise<RelatedItem> {
    return this.post<RelatedItem>('/related_items', data, clerkUserId);
  }

  async deleteRelatedItem(relatedItemId: number, clerkUserId: string): Promise<void> {
    return this.delete<void>(`/related_items/${relatedItemId}`, clerkUserId);
  }

  // Postmark Email API methods
  async getPostmarkTemplates(clerkUserId: string): Promise<PostmarkTemplatesResponse> {
    const token = await this.getAuthToken();

    const response = await fetch(`${POSTMARK_BASE_URL}/templates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Postmark API error:', errorText);
      throw new Error(`Failed to fetch Postmark templates: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response.result;
  }

  async getPostmarkTemplateByAlias(alias: string): Promise<PostmarkTemplateDetail> {
    const token = await this.getAuthToken();

    const response = await fetch(`${POSTMARK_BASE_URL}/templates/${alias}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Postmark template detail API error:', errorText);
      throw new Error(`Failed to fetch template details: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response.result;
  }

  async sendTemplateEmail(clerkUserId: string, emailData: SendTemplateEmailRequest): Promise<SendTemplateEmailResponse> {
    const token = await this.getAuthToken();

    const requestBody = {
      campaigns_id: emailData.campaigns_id,
      template_id: emailData.template_id,
      to: emailData.to,
      template_model: emailData.template_model || {},
      Tag: emailData.tag || "",
      Metadata: emailData.metadata || {}
    };

    console.log('📧 Sending email request to:', `${POSTMARK_BASE_URL}/email/withTemplate`);
    console.log('📧 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${POSTMARK_BASE_URL}/email/withTemplate/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Elegant-Userid': clerkUserId,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Postmark send error:', errorText);

      // Check for 429 Too Many Requests error
      if (response.status === 429) {
        const error = new Error(`Too many requests - contact frequency limit reached`) as any;
        error.code = 'TOO_MANY_REQUESTS';
        error.campaignsId = emailData.campaigns_id;
        throw error;
      }

      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return await response.json();
  }

  // Reset campaign lead contact status
  async resetCampaignLead(campaignsId: string, clerkUserId: string): Promise<void> {
    return this.post<void>('/campaigns/reset_lead', { campaigns_id: campaignsId }, clerkUserId);
  }

  // Send simple email via Postmark
  async sendSimpleEmail(emailData: {
    From: string;
    To: string;
    Subject: string;
    HtmlBody: string;
    MessageStream: string;
  }): Promise<{ success: boolean; message?: string }> {
    const token = await this.getAuthToken();

    console.log('📧 Sending simple email request to:', `${POSTMARK_BASE_URL}/send_simple_email`);
    console.log('📧 Request body:', JSON.stringify(emailData, null, 2));

    const response = await fetch(`${POSTMARK_BASE_URL}/send_simple_email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Postmark simple email send error:', errorText);
      throw new Error(`Failed to send simple email: ${response.statusText}`);
    }

    return await response.json();
  }

  // Get campaign leads recipients for email sending
  async getCampaignLeadsRecipients(clerkUserId: string, campaignId: string): Promise<CampaignLeadsRecipientsResponse> {
    return this.get<CampaignLeadsRecipientsResponse>(`/campaigns/leads/${campaignId}`, clerkUserId);
  }

  // Tasks API methods
  async getTasks(clerkUserId: string, page: number = 1, perPage: number = 25): Promise<TasksResponse> {
    const externalParams = { page, PerPage: perPage };
    return this.get<TasksResponse>(`/tasks?external=${encodeURIComponent(JSON.stringify(externalParams))}`, clerkUserId);
  }

  async createTask(data: CreateTaskRequest, clerkUserId: string): Promise<Task> {
    return this.post<Task>('/tasks', data, clerkUserId);
  }

  async updateTask(taskId: string, data: Partial<CreateTaskRequest>, clerkUserId: string): Promise<Task> {
    return this.patch<Task>(`/tasks/${taskId}`, data, clerkUserId);
  }

  async deleteTask(taskId: string, clerkUserId: string): Promise<void> {
    return this.delete<void>(`/tasks/${taskId}`, clerkUserId);
  }

  // ============ Workflow API ============

  /**
   * Get all workflows using /items_all endpoint
   */
  async getWorkflows(clerkUserId: string): Promise<{
    id: string;
    name: string;
    description: string;
    trigger: { itemType: string; event: string };
    activities: any[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[]> {
    const response = await this.request<{
      itemsReceived: number;
      curPage: number;
      nextPage: number | null;
      prevPage: number | null;
      offset: number;
      perPage: number;
      itemsTotal: number;
      pageTotal: number;
      items: any[];
    }>('/items_all?item_type=Workflow', {
      method: 'GET',
      headers: { 'X-Elegant-Userid': clerkUserId },
    }, clerkUserId);

    return (response.items || []).map((item: any) => ({
      id: String(item.id),
      name: item.title || 'Untitled Workflow',
      description: item.description || '',
      trigger: item.item_info?.trigger || { itemType: '', event: '' },
      activities: item.item_info?.activities || [],
      isActive: !item.Is_disabled,
      createdAt: new Date(item.created_at).toISOString(),
      updatedAt: new Date(item.modified_at || item.created_at).toISOString(),
    }));
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    clerkUserId: string,
    data: {
      name: string;
      description?: string;
      item_info: Record<string, any>;
      is_active?: boolean;
    }
  ): Promise<any> {
    return this.post('/items', {
      item_type: 'Workflow',
      title: data.name,
      description: data.description || '',
      item_info: data.item_info,
      is_active: data.is_active ?? false,
    }, clerkUserId);
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(
    clerkUserId: string,
    itemsId: number,
    data: {
      title?: string;
      name?: string;
      description?: string;
      item_info?: Record<string, any>;
      Is_disabled?: boolean;
    }
  ): Promise<any> {
    return this.patch(`/items/${itemsId}`, data, clerkUserId);
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(clerkUserId: string, itemsId: number): Promise<any> {
    return this.delete(`/items/${itemsId}`, clerkUserId);
  }

  /**
   * Get workflow activities for a workflow
   */
  async getWorkflowActivities(clerkUserId: string, itemsId: number): Promise<any[]> {
    return this.get(`/workflow_activities?items_id=${itemsId}`, clerkUserId);
  }

  /**
   * Get a single workflow activity by ID
   */
  async getWorkflowActivity(clerkUserId: string, activityId: number): Promise<any> {
    return this.get(`/workflow_activities/${activityId}`, clerkUserId);
  }

  /**
   * Create a workflow activity
   */
  async createWorkflowActivity(
    clerkUserId: string,
    data: {
      items_id: number;
      name: string;
      description?: string;
      activity_info: Record<string, any>;
    }
  ): Promise<any> {
    return this.post('/workflow_activities', data, clerkUserId);
  }

  /**
   * Update a workflow activity
   */
  async updateWorkflowActivity(
    clerkUserId: string,
    activityId: number,
    data: {
      name?: string;
      description?: string;
      activity_info?: Record<string, any>;
    }
  ): Promise<any> {
    return this.patch(`/workflow_activities/${activityId}`, data, clerkUserId);
  }

  /**
   * Delete a workflow activity
   */
  async deleteWorkflowActivity(clerkUserId: string, activityId: number): Promise<any> {
    return this.delete(`/workflow_activities/${activityId}`, clerkUserId);
  }

  // ============ Workflow Activity Events API ============

  /**
   * Create a workflow activity event (trigger mapping)
   */
  async createWorkflowActivityEvent(
    clerkUserId: string,
    data: {
      workflow_items_id: number;
      items_type: string;
      trigger_event: string;
      seq?: number;
      event_info?: Record<string, any>;
    }
  ): Promise<any> {
    const payload: Record<string, any> = {
      workflow_items_id: data.workflow_items_id,
      items_type: data.items_type,
      event_name: data.trigger_event,
    };
    if (data.seq !== undefined) payload.seq = data.seq;
    if (data.event_info) payload.event_info = data.event_info;
    return this.post('/workflow_activities_events', payload, clerkUserId);
  }

  /**
   * Get workflow activity events for a workflow
   */
  async getWorkflowActivityEvents(clerkUserId: string, itemsId: number): Promise<any[]> {
    return this.get(`/workflow_activities_events?items_id=${itemsId}`, clerkUserId);
  }

  /**
   * Update a workflow activity event
   */
  async updateWorkflowActivityEvent(
    clerkUserId: string,
    eventId: number,
    workflowItemsId: number,
    data: {
      items_type?: string;
      trigger_event?: string;
      seq?: number;
      event_info?: Record<string, any>;
    }
  ): Promise<any> {
    const payload: { workflow_items_id: number; items_type?: string; event_name?: string; seq?: number; event_info?: Record<string, any> } = {
      workflow_items_id: workflowItemsId,
    };
    if (data.items_type) payload.items_type = data.items_type;
    if (data.trigger_event) payload.event_name = data.trigger_event;
    if (data.seq !== undefined) payload.seq = data.seq;
    if (data.event_info) payload.event_info = data.event_info;
    return this.patch(`/workflow_activities_events/${eventId}`, payload, clerkUserId);
  }

  /**
   * Delete a workflow activity event
   */
  async deleteWorkflowActivityEvent(clerkUserId: string, eventId: number): Promise<any> {
    return this.delete(`/workflow_activities_events/${eventId}`, clerkUserId);
  }

  /**
   * Get workflow execution logs with optional filters
   */
  async getWorkflowLogs(
    clerkUserId: string,
    filters: {
      items_slug?: string | null;
      items_id?: number | null;
      start_date?: string | null;
      end_date?: string | null;
      page?: number;
      perPage?: number;
    } = {}
  ): Promise<WorkflowLogsResponse> {
    const { page = 1, perPage = 25, items_slug, items_id, start_date, end_date } = filters;

    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('perPage', String(perPage));
    if (items_slug) params.append('items_slug', items_slug);
    if (items_id) params.append('items_id', String(items_id));
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);

    return this.get(`/workflow_logs?${params.toString()}`, clerkUserId);
  }

  /**
   * Get a single workflow log by ID
   */
  async getWorkflowLogDetails(clerkUserId: string, logId: number): Promise<WorkflowLog> {
    return this.get(`/workflow_logs/${logId}`, clerkUserId);
  }

  /**
   * Bulk reset all server-side throttle records for a workflow
   * This forces all users to be able to trigger the workflow again
   */
  async resetWorkflowThrottles(clerkUserId: string, workflowId: number): Promise<{ success: boolean; count?: number }> {
    try {
      const response = await this.delete<{ success?: boolean; count?: number }>(`/workflows_throttle/reset_all?workflow_id=${workflowId}`, clerkUserId);
      return { success: true, count: response?.count };
    } catch (error) {
      console.error('[AdminAPI] Bulk throttle reset failed:', error);
      return { success: false };
    }
  }

  /**
   * Bump throttle version for a workflow trigger to invalidate all browser caches
   * Pass the new version number to event_info.throttle.version
   */
  async bumpThrottleVersion(
    clerkUserId: string,
    eventId: number,
    workflowItemsId: number,
    currentThrottle: Record<string, any>
  ): Promise<any> {
    const newVersion = (currentThrottle.version || 1) + 1;
    return this.updateWorkflowActivityEvent(clerkUserId, eventId, workflowItemsId, {
      event_info: {
        throttle: {
          ...currentThrottle,
          version: newVersion,
        },
      },
    });
  }

  /**
   * Set throttle reset timestamp to invalidate browser caches older than now
   */
  async setThrottleResetTimestamp(
    clerkUserId: string,
    eventId: number,
    workflowItemsId: number,
    currentThrottle: Record<string, any>
  ): Promise<any> {
    return this.updateWorkflowActivityEvent(clerkUserId, eventId, workflowItemsId, {
      event_info: {
        throttle: {
          ...currentThrottle,
          resetAt: Date.now(),
        },
      },
    });
  }

  // ============ Notes API ============

  /**
   * Get notes with optional filters for bookings_id or leads_id
   * Notes are lazy-loaded for performance
   * GET /notes with query params
   */
  async getNotes(
    clerkUserId: string,
    options: {
      customers_id?: number | null;
      leads_id?: number | null;
      bookings_id?: number | null;
      search?: string | null;
      external?: {
        page: number;
        perPage: number;
      };
    } = {}
  ): Promise<NotesResponse> {
    const {
      customers_id = null,
      leads_id = null,
      bookings_id = null,
      search = null,
      external = { page: 1, perPage: 5 }
    } = options;

    const params = new URLSearchParams();

    // Add external pagination as JSON
    params.append('external', JSON.stringify({
      page: external.page,
      PerPage: external.perPage,
    }));

    // Add optional filters
    if (bookings_id !== null) {
      params.append('bookings_id', String(bookings_id));
    }
    if (leads_id !== null) {
      params.append('leads_id', String(leads_id));
    }
    if (customers_id !== null) {
      params.append('customers_id', String(customers_id));
    }
    if (search !== null) {
      params.append('search', search);
    }

    return this.get<NotesResponse>(`/notes?${params.toString()}`, clerkUserId);
  }

  /**
   * Create a new note
   * POST /notes with the specified payload
   */
  async createNote(noteData: CreateNoteRequest, clerkUserId: string): Promise<Note> {
    return this.post<Note>('/notes', noteData, clerkUserId);
  }

  /**
   * Update an existing note
   */
  async updateNote(noteId: number, noteData: Partial<CreateNoteRequest>, clerkUserId: string): Promise<Note> {
    return this.patch<Note>(`/notes/${noteId}`, noteData, clerkUserId);
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: number, clerkUserId: string): Promise<void> {
    return this.delete<void>(`/notes/${noteId}`, clerkUserId);
  }
}

export interface CampaignLeadsRecipientsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: CampaignLeadRecipient[];
}

export interface CampaignLeadRecipient {
  id: string;
  created_at: number;
  shops_id: string;
  customers_id: string | null;
  campaign_info: Record<string, any>;
  status: string;
  type: string;
  items_id: number;
  leads_id: number;
  contact_date: number | null;
  ms_clarity: Record<string, any>;
  last_contact_date: string | null;
  _leads: {
    created_at: number;
    lead_payload: {
      email: string;
      notes?: string;
      last_name: string;
      first_name: string;
      mobile_number?: string;
      property_address?: string;
    };
    status: string;
    customers_id: string | null;
    email: string;
    modified_by_id: string | null;
  };
}

export interface CampaignLead {
  id: string;
  created_at: number;
  shops_id: string;
  customers_id: string | null;
  campaign_info: Record<string, any>;
  status: string;
  type: string;
  items_id: number;
  leads_id: number;
  contact_date: number | null;
  last_contact_date: number | null;
  _customers?: {
    id: string;
    created_at: number;
    elegant_user_id: string;
    customer_number: number;
    Full_name: string;
    is_online_now: boolean;
    is_online_timestamp: number;
    is_blocked_or_denied: boolean;
    email: string;
    cust_info: Record<string, any>;
  };
  ms_clarity?: Record<string, any>;
  _leads?: {
    created_at: number;
    name?: string;
    lead_payload: {
      email?: string;
      notes?: string;
      last_name?: string;
      first_name?: string;
      mobile_number?: string;
      property_address?: string;
    };
    status: string;
    customers_id: string | null;
    email: string;
    modified_by_id: string | null;
  };
}

export interface CampaignLeadsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: CampaignLead[];
}

export interface CampaignLeadDetail {
  id: string;
  created_at: number;
  shops_id: string;
  customers_id: string | null;
  campaign_info: Record<string, any>;
  status: string;
  type: string;
  items_id: number;
  leads_id: number;
  contact_date: number | null;
  _items?: {
    slug: string;
    item_type: string;
    Is_disabled: boolean;
    title: string;
    description: string;
    sku: string;
  };
  _leads?: {
    id?: number;
    created_at: number;
    lead_payload: {
      email?: string;
      notes?: string;
      last_name?: string;
      first_name?: string;
      mobile_number?: string;
      property_address?: string;
    };
    status: string;
    customers_id: string | null;
    email: string;
    modified_by_id: string | null;
  };
}

export interface RelatedItem {
  id: number;
  created_at: number;
  shops_id: string;
  items_id: number;
  related_items_id: number;
  seq: number;
  is_visible: boolean;
  modified_by_id: string;
}

export interface RelatedItemsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: RelatedItem[];
}

export interface CreateRelatedItemRequest {
  items_id: number;
  related_items_id: number;
  seq: number;
  is_visible: boolean;
}

export interface RaffleEntry {
  id: number;
  items_id: number;
  email: string;
  full_name: string;
  mobile_number?: string;
  created_at: number;
  customers_id?: string;
  leads_id?: number;
  shops_id?: string;
  is_winner?: boolean;
  date_won?: number;
  modified_by_id?: string;
}

export interface RaffleWinner {
  id: number;
  created_at: number;
  shops_id: string;
  items_id: number;
  customers_id: string | null;
  leads_id: number | null;
  mobile_number: number | string;
  email: string;
  full_name: string;
  is_winner: boolean;
  date_won: number;
  modified_by_id: string | null;
}

export interface RaffleEntriesResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: RaffleEntry[];
}

export interface RaffleEntryResponse {
  id?: number;
  items_id: number;
  success?: boolean;
  message?: string;
}

export interface CreateItemRequest {
  item_type: string;
  Is_disabled: boolean;
  title: string;
  description: string;
  SEO_Tags: string;
  tags: string;
  slug: string;
  item_info?: Record<string, any>;
}

export interface CreateItemResponse {
  id: number;
  item_type: string;
  Is_disabled: boolean;
  title: string;
  description: string;
  SEO_Tags: string;
  tags: string;
  slug: string;
}

export interface ImageUploadResponse {
  id: string;
  image_type: 'Image' | 'Video' | 'YouTube';
  image: {
    url: string;
    path: string;
    name: string;
    type: string;
    size: number;
    mime: string;
    meta: any;
  } | null;
  video: {
    url: string;
    path: string;
    name: string;
    type: string;
    size: number;
    mime: string;
    meta: any;
  } | null;
}

export interface UpdateMediaFileRequest {
  title?: string;
  description?: string;
  tags?: string;
  modified_by_id: string;
  media_info?: Record<string, any>;
  media_attributes?: Record<string, any>;
}

export interface MediaFile {
  id: string;
  created_at: number;
  shops_id: string;
  image_type: 'Image' | 'Video' | 'YouTube';
  title?: string;
  description?: string;
  tags?: string;
  image: {
    access: string;
    path: string;
    name: string;
    type: string;
    size: number;
    mime: string;
    meta: {
      width: number;
      height: number;
    };
    url: string;
  } | null;
  video: {
    access: string;
    path: string;
    name: string;
    type: string;
    size: number;
    mime: string;
    meta: any;
    url: string;
  } | null;
  media_info?: Record<string, any> | null;
  media_attributes?: Record<string, any> | null;
  seq?: number;
  customers_id?: string | null;
  modified_by_id?: string | null;
  attachments?: any;
  created_by?: {
    id: string;
    Full_name: string;
    email?: string;
  } | null;
  _customers?: {
    id: string;
    Full_name: string;
    email?: string;
  } | null;
}

export interface MediaFilesResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: MediaFile[];
}

export interface ShopInfo {
  id: number;
  created_at: number;
  shops_id: string;
  title: string;
  description: string;
  logo: string;
  seo_script_text: string;
  home_image_url: string;
  hide_home_image_url: boolean;
  home_background_color: string;
  header_1: string;
  header_1_font_color: string;
  header_2: string;
  header_2_font_color: string;
  header_3: string;
  header_3_font_color: string;
  header_4: string;
  header_4_font_color: string;
  header_5: string;
  header_5_font_color: string;
  header_6: string;
  header_6_font_color: string;
  menu_header_background_color: string;
  menu_footer_background_color: string;
  Items_categories_title: string;
  Items_categories_description: string;
  copyright_text: string;
  menu_header_font_color: string;
  menu_footer_font_color: string;
  header_7: string;
  header_7_font_color: string;
  header_7_background_color: string;
  header_8: string;
  header_8_font_color: string;
  header_9: string;
  header_9_font_color: string;
  header_9_background_color: string;
  user_dashboard_url: string;
  user_settings_url: string;
  user_shopping_cart_url: string;
  redirect_after_signup: string;
  redirect_after_signin: string;
  redirect_after_logout: string;
  user_dashboard_name: string;
  user_shopping_cart_name: string;
  user_setting_name: string;
  user_logout_name: string;
  hide_search_bar: boolean;
  hide_shopping_cart: boolean;
  contact_info: any;
  shops_settings: any;
  // Email settings
  max_emails_per_day?: number;
  email_contact_days_freq?: number;
  from_email?: string;
}

export interface AdminShopResponse {
  id: string;
  created_at: number;
  name: string;
  description: string;
  logo: string;
  custom_domain: string;
  Is_visible: boolean;
  slug: string;
  allow_affiliate: boolean;
  testmode: boolean;
  _shop_info: ShopInfo;
  _franchisor?: {
    id: number;
    created_at: number;
    shops_id: string;
    franchise_id: string;
    managers_id: string[];
    owner_customers_id: string | null;
  };
}

export interface LeadInfo {
  lead_payload: Record<string, any>;
  status: string;
  email: string;
  customers_id?: string | null;
  modified_by_id?: string;
  last_contact_date?: number;
  last_contact_customers_id?: string;
  profile_image_url?: string;
  media_info?: any;
  tags?: string;
}

export interface Item {
  id: number;
  slug: string;
  shops_id: string;
  item_type: string;
  Is_disabled: boolean;
  created_at: number;
  title: string;
  description: string;
  SEO_Tags: string;
  tags: string;
  price?: number;
  unit?: string;
  currency?: string;
  sku?: string;
  item_info?: Record<string, any> | null;
  rank?: number;
  min_quantity?: number;
  item_attributes?: Record<string, any> | null;
  customers_id?: string | null;
  modified_by_id?: string | null;
  _item_images_of_items?: {
    items: Array<{
      id: number;
      display_image: string;
      image_type: 'Image' | 'Video' | 'YouTube';
      seq: number;
      items_id?: number;
      Is_disabled?: boolean;
      created_at?: number;
    }>;
  };
  // Lead information for applications
  _leads?: LeadInfo;
  lead_payload?: Record<string, any>;
  booking_info?: Record<string, any>;
  _customers?: {
    id: string;
    Full_name: string;
    email: string;
    elegant_user_id?: string;
  };
  _items?: {
    title: string;
    id?: number;
    slug?: string;
    item_type?: string;
  };
  booking_slug?: string;
  status?: string;
}

export interface ItemsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: Item[];
}

export interface ItemTypesResponse {
  name: string;
  type: string;
  style: string;
  access: string;
  values: string[];
  default: string;
  nullable: boolean;
  required: boolean;
  description: string;
}

export interface ItemImage {
  id: number;
  items_id?: number;
  created_at?: number;
  display_image: string;
  seq: number;
  image_type: 'Image' | 'Video' | 'YouTube';
  Is_disabled?: boolean;
}

export interface ItemImagesResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: ItemImage[];
}

export interface CreateItemImageRequest {
  items_id: number;
  display_image: string;
  seq: number;
  image_type: 'Image' | 'Video' | 'YouTube';
  Is_disabled: boolean;
}

export interface CustomerRole {
  id: string;
  created_at: number;
  customers_id: string;
  shops_id: string;
  role: string | null;
  block_deny_access: boolean;
  block_deny_reason: string | null;
  status: string;
  referral: string;
  is_onboarded: boolean;
  cust_role_info: any | null;
  is_manager: boolean;
  is_owner: boolean;
}

export interface CustomerData {
  id: string;
  created_at: number;
  elegant_user_id: string;
  customer_number: number;
  Full_name: string;
  is_online_now: boolean;
  is_online_timestamp: number;
  is_blocked_or_denied: boolean;
  email: string;
  image_url?: string;
  avatar_url?: string;
}

export interface Customer {
  id: string;
  created_at: number;
  customers_id: string;
  shops_id: string;
  role: string;
  block_deny_access: boolean;
  block_deny_reason: string | null;
  status: string;
  referral: string;
  is_onboarded: boolean;
  cust_role_info: Record<string, any>;
  is_manager: boolean;
  is_owner: boolean;
  shops_franchisor_id: number;
  _customers: CustomerData;
}

export interface CustomersResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: Customer[];
}

export interface UpdateCustomerInfoRequest {
  role?: string | null;
  status?: string;
  block_deny_access?: boolean;
  is_manager?: boolean;
  is_owner?: boolean;
}

export interface LeadPayload {
  email?: string;
  mobile_number?: string;
  property_address?: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
  phone_numbers?: { type: string; number: string }[];
  addresses?: { line1: string; region: string; country: string; country_code: string }[];
  config?: { key: string; val: string; datatype: string }[];
  [key: string]: any;
}

export interface LeadShop {
  id: string;
  name: string;
  slug: string;
}

export interface Lead {
  id: number;
  created_at: number;
  shops_id: string;
  lead_payload: LeadPayload;
  status: string;
  customers_id: string | null;
  geo_location: Record<string, any>;
  headers: Record<string, any>;
  email: string;
  name?: string;
  modified_by_id: string | null;
  _shops: LeadShop;
  _leads_assignment: any[];
  created_by?: {
    id: string;
    Full_name: string;
  };
  modified_by?: {
    id: string;
    Full_name: string;
  };
}

export interface CreateLeadRequest {
  lead_payload: LeadPayload;
  email: string;
  status: string;
  name?: string;
}

export interface LeadsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: Lead[];
}

export interface BookingItem {
  id: number;
  created_at: number;
  bookings_id: number;
  items_id: number;
  booking_items_info: Record<string, any>;
  quantity: number;
  shops_id: string;
  price: number;
  unit: string;
  _items: {
    id: number;
    slug: string;
    shops_id: string;
    item_type: string;
    Is_disabled: boolean;
    created_at: number;
    title: string;
    description: string;
    SEO_Tags: string;
    tags: string;
    price: number;
    unit: string;
    currency: string;
    sku: string;
    item_info: Record<string, any>;
    rank: number;
    min_quantity: number;
    item_attributes: Record<string, any>;
    customers_id: string | null;
    modified_by_id: string | null;
  };
}

export interface Order {
  id: number;
  created_at: number;
  customers_id: string;
  booking_slug: string;
  shops_id: string;
  customer_invite_id: string | null;
  is_deleted: boolean;
  leads_id: number;
  booking_type: string;
  status: string;
  payment_id: string;
  payment_response: any;
  booking_info?: Record<string, any>;
  _booking_items_of_bookings: {
    items: BookingItem[];
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number | null;
    perPage: number | null;
  };
  _booking_items?: {
    items: BookingItem[];
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number | null;
    perPage: number | null;
  };
  _customers?: CustomerData;
  _leads?: {
    id?: number;
    created_at: number;
    lead_payload: Record<string, any>;
    status: string;
    customers_id: string | null;
    email: string;
  };
  _items?: {
    id?: number;
    slug?: string;
    title?: string;
    item_type?: string;
    item_info?: Record<string, any>;
  };
  _notes_of_bookings?: Array<{
    is_read: boolean;
    total: number;
  }>;
}

export interface OrdersResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: Order[];
}

export interface CustomerNote {
  id: string;
  created_at: number;
  shops_id: string;
  customers_id: string;
  notes: string;
  created_by_id: string;
  _created_by: {
    id: string;
    created_at: number;
    elegant_user_id: string;
    customer_number: number;
    Full_name: string;
    is_online_now: boolean;
    is_online_timestamp: number;
    is_blocked_or_denied: boolean;
    email: string;
  };
}

export interface CustomerNotesResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: CustomerNote[];
}

export interface CreateCustomerNoteRequest {
  customers_id: string;
  notes: string;
}

export interface UpdateCustomerNoteRequest {
  notes: string;
}

export interface UpdateBookingRequest {
  booking_type: string;
}

export interface LeadsCommunicationItem {
  id: string;
  created_at: number;
  leads_id: number;
  shops_id: string;
  communication_type: string;
  message_id: string;
}

export interface LeadsCommunicationResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: LeadsCommunicationItem[];
}

export interface MembershipBookingItem {
  id: number;
  created_at: number;
  bookings_id: number;
  items_id: number;
  booking_items_info: {
    membership_type?: string;
    membership_paid_date?: string;
  };
  quantity: number;
  shops_id: string;
  price: number;
  unit: string;
  _items: {
    id: number;
    slug: string;
    item_type: string;
    Is_disabled: boolean;
    title: string;
    description: string;
    SEO_Tags: string;
    tags: string;
    price: number;
    sku: string;
    rank: number;
    min_quantity: number;
    item_attributes: any;
  };
  _bookings: {
    created_at: number;
    customers_id: string;
    booking_slug: string;
    customer_invite_id: string | null;
    is_deleted: boolean;
    leads_id: number;
    booking_type: string;
    status: string;
    payment_id: string;
    payment_response: string;
    checkout_type: string;
    booking_info: any;
  };
}

export interface BookingItemsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: MembershipBookingItem[];
}

// Postmark Email Types
export interface PostmarkTemplate {
  Alias: string;
  Name: string;
  Active: boolean;
  TemplateId: number;
  TemplateType: 'Standard' | 'Layout';
  LayoutTemplate: string | null;
}

export interface PostmarkTemplateDetail {
  HtmlBody: string;
  TextBody?: string;
  Subject: string;
  Name: string;
  Alias: string;
  TemplateId: number;
  Active: boolean;
  TemplateType: 'Standard' | 'Layout';
  LayoutTemplate: string | null;
  AssociatedServerId: number;
}

export interface PostmarkTemplatesResponse {
  TotalCount: number;
  max_email_per_day: number;
  Templates: PostmarkTemplate[];
}

export interface SendTemplateEmailRequest {
  campaigns_id: string;
  template_id: number;
  to: string; // Recipient email address
  template_model?: Record<string, any>;
  tag?: string;
  metadata?: Record<string, any>;
}

export interface SendTemplateEmailResponse {
  success: boolean;
  message?: string;
  messageId?: string;
}

// Tasks Types
export interface TaskCustomer {
  customer_number: number;
  Full_name: string;
  is_online_now: boolean;
  is_online_timestamp: number;
  is_blocked_or_denied: boolean;
  email: string;
}

export interface Task {
  id: string;
  created_at: number;
  shops_id: string;
  created_customers_id: string;
  assigned_customers_id: string | null;
  status: string;
  title: string;
  description: string;
  due_date: number | null;
  task_type: string;
  modified_customers_id: string | null;
  _assigned_customer?: TaskCustomer | null;
  _created_by_customer?: TaskCustomer | null;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: string;
  task_type?: string;
  due_date?: number | null;
  assigned_customers_id?: string | null;
}

export interface TasksResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: Task[];
}

// Notes Types
export interface Note {
  id: number;
  created_at: number;
  shops_id: string;
  assigned_customers_id: string | null;
  status: string;
  description: string;
  leads_id: number | null;
  is_read: boolean;
  leads_communication_id: string | null;
  bookings_id: number | null;
  _assigned_customer?: {
    id: string;
    Full_name: string;
    email: string;
  } | null;
  _created_by?: {
    id: string;
    Full_name: string;
    email: string;
  } | null;
}

export interface NotesResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: Note[];
}

export interface CreateNoteRequest {
  assigned_customers_id: string | null;
  status: string;
  description: string;
  leads_id: number | null;
  is_read: boolean;
  leads_communication_id: string | null;
  bookings_id: number | null;
}

// Dashboard Analytics Types
export interface CampaignActivityItem {
  status: string;
  count: number;
  leads: number;
  activity_date: number[];
}

export interface CampaignLeadsAnalytics {
  total_leads: number;
  new_leads: number;
  contacted_leads: number;
  converted_leads: number;
  conversion_rate: number;
  engagement_rate: number;
  by_status: Array<{
    status: string;
    count: number;
  }>;
  by_campaign: Array<{
    campaign_name: string;
    campaign_id: string;
    leads_count: number;
    contacted_count: number;
    converted_count: number;
  }>;
  engagement_timeline?: Array<{
    date: string;
    opens: number;
    clicks: number;
    deliveries: number;
  }>;
}

export interface MemberGrowthAnalytics {
  total_members: number;
  new_members: number;
  active_members: number;
  by_role: Array<{
    role: string;
    count: number;
  }>;
  timeline: Array<{
    date: string;
    total: number;
    new: number;
  }>;
}

export interface BookingAnalytics {
  total_bookings: number;
  new_bookings: number;
  total_revenue: number;
  new_revenue: number;
  currency: string;
  by_status: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  by_type: Array<{
    booking_type: string;
    count: number;
    revenue: number;
  }>;
  revenue_timeline: Array<{
    date: string;
    revenue: number;
    bookings_count: number;
  }>;
}

export interface ItemPerformanceAnalytics {
  top_items: Array<{
    item_id: number;
    item_title: string;
    item_type: string;
    total_sold: number;
    total_revenue: number;
    currency: string;
  }>;
  by_item_type: Array<{
    item_type: string;
    items_sold: number;
    total_revenue: number;
  }>;
  revenue_leaders: Array<{
    item_id: number;
    item_title: string;
    item_type: string;
    revenue: number;
    percentage_of_total: number;
  }>;
}

export interface TaskStatusItem {
  tasks_status: string;
  tasks_count: number;
  tasks_type: string[];
  tasks_created_at: number[];
  tasks_due_date: (number | null)[];
  tasks_assigned_customers_id: (string | null)[];
}

export interface TaskAssigneeItem {
  assigned_customer_name: string | null;
  assigned_customers_id: string | null;
  tasks_count: number;
  tasks_status: string[];
}

export interface TaskDueDateItem {
  category: 'overdue' | 'due_today' | 'due_this_week' | 'due_later' | 'no_due_date';
  tasks_count: number;
  tasks_ids: string[];
}

export interface TaskTypeItem {
  task_type: string;
  tasks_count: number;
  tasks_status: string[];
}

export interface TaskTimelineItem {
  date: string; // Format: "YYYY-MM-DD" or timestamp
  tasks_count: number;
  tasks_status: Record<string, number>; // e.g., { "New": 2, "Completed": 1 }
}

export interface DashboardAnalyticsResponse {
  shop_info: {
    id: string;
    name: string;
    domain: string;
  };
  period: {
    start: number;
    end: string | number;
  };
  metrics: {
    items: {
      total: number;
      new: number;
    };
    bookings: {
      total: number;
      new: number;
      total_booking_types?: Array<{
        booking_types: string;
        bookings: number;
        booking_status: string[];
      }>;
      total_booking_items?: Array<{
        booking_items: string;
        bookings: number;
        price: number;
        quantity: number;
      }>;
    };
    customers: {
      total: number;
      new: number;
    };
    leads: {
      total: number;
      new: number;
    };
    reviews: {
      total: number;
      new: number;
      ratings: Array<{
        reviews_Helpful_count: number;
        reviews_Rating: number;
        reviews_Rating_1: number;
        reviews_Rating_2: number;
        reviews_Rating_3: number;
        reviews_Comments: number;
      }>;
      new_ratings: Array<{
        reviews_Helpful_count: number;
        reviews_Rating: number;
        reviews_Rating_1: number;
        reviews_Rating_2: number;
        reviews_Rating_3: number;
        reviews_Comments: number;
      }>;
    };
    item_types: {
      total: number;
      items: Array<{
        items_item_types: string;
        count: number;
        total_item_price: number;
        items_currency: string[];
      }>;
      new_items: Array<{
        items_item_types: string;
        count: number;
        total_item_price: number;
        items_currency: string[];
      }>;
    };
    campaign_activity?: {
      total: CampaignActivityItem[];
    };
    tasks?: {
      total: TaskStatusItem[];
      new_total: TaskStatusItem[];
      assignees?: TaskAssigneeItem[];
      due_dates?: TaskDueDateItem[];
      types?: TaskTypeItem[];
      timeline?: TaskTimelineItem[];
    };
    campaign_leads?: CampaignLeadsAnalytics;
    member_growth?: MemberGrowthAnalytics;
    booking_analytics?: BookingAnalytics;
    item_performance?: ItemPerformanceAnalytics;
  };
  analytics_data: {
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number;
    perPage: number;
    itemsTotal: number;
    pageTotal: number;
    items: any[];
  };
}

export interface WorkflowLog {
  id: number;
  created_at: number; // Unix timestamp
  workflows_items_id: number;
  items_id: number;
  items_slug: string;
  item_type?: string; // Top-level item type (event, class, etc.)
  event?: string; // Top-level trigger event (view, purchase, etc.)
  log?: {
    trigger_event: string;
    item_type?: string;
    executed_actions: string[];
    timestamp: string;
    item_data?: Record<string, any>;
  };
  _items?: {
    slug: string;
    item_type: string;
    Is_disabled: boolean;
    title: string;
    description: string;
  };
}

export interface WorkflowLogsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  items: WorkflowLog[];
}

export const adminAPI = new AdminAPI();
