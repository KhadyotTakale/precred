import { apiRateLimiter } from './api-rate-limiter';

const ELEGANT_BASE_URL = 'https://api.elegant.ux.wimsup.com';
const ELEGANT_DOMAIN = 'tbmandsc.com';
const STRIPE_BASE_URL = 'https://api.elegant.stripe.wimsup.com';

// Throttle execute request/response types
export interface ThrottleExecuteRequest {
  trigger_id: number;
  workflow_items_id: number;
  user_id: string | null; // null for anonymous users
  items_slug: string;
  items_type: string;
  event_name: string;
  throttle: {
    enabled: boolean;
    scope: 'none' | 'session' | 'day' | 'week' | 'lifetime';
    target: 'browser' | 'user' | 'both';
    max_executions?: number;
    cooldown_minutes?: number;
  };
}

export interface ThrottleExecuteResponse {
  allowed: boolean;
  id?: number; // workflow_event_log_id - saved for status queries
  reason?: string; // "cooldown_active" | "max_executions_reached" | "first_execution"
  remaining_seconds?: number;
  execution_count?: number;
  recorded?: boolean; // true if execution was recorded
}

export interface ThrottleStatusResponse {
  allowed: boolean;
  reason?: string;
  remaining_seconds?: number;
  execution_count?: number;
  scope?: 'none' | 'session' | 'day' | 'week' | 'lifetime';
  max_executions?: number;
  cooldown_minutes?: number;
}

class ElegantAPI {
  private apiToken: string | null = null;
  private authSecret: string;

  constructor() {
    this.authSecret = import.meta.env.VITE_ELEGANT_AUTH_SECRET || '';
  }

  private getHeaders(includeAuth: boolean = false, clerkUserId?: string): HeadersInit {
    const headers: HeadersInit = {
      'X-Elegant-Domain': ELEGANT_DOMAIN,
      'X-Elegant-Auth': this.authSecret,
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }

    if (clerkUserId) {
      headers['X-Elegant-Userid'] = clerkUserId;
    }

    return headers;
  }

  private clerkUserId: string | null = null;

  setClerkUserId(userId: string | null): void {
    this.clerkUserId = userId;
  }

  getClerkUserId(): string | null {
    return this.clerkUserId;
  }

  async authenticate(clerkUserId?: string): Promise<string> {
    try {
      const userIdToUse = clerkUserId || this.clerkUserId;
      const headers = this.getHeaders(false, userIdToUse || undefined);

      const response = await fetch(`${ELEGANT_BASE_URL}/auth/me`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.apiToken = data.authToken || data.apiToken || data.token || data.access_token;

      if (!this.apiToken) {
        throw new Error('No API token received from authentication');
      }

      return this.apiToken;
    } catch (error) {
      console.error('Elegant API authentication error:', error);
      throw error;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    clerkUserId?: string,
    rateLimitOptions?: { priority?: number; bypassQueue?: boolean }
  ): Promise<T> {
    const userIdToUse = clerkUserId || this.clerkUserId || undefined;

    if (!this.apiToken) {
      await this.authenticate(userIdToUse);
    }

    // Create a deduplication key based on endpoint and method
    const method = options.method || 'GET';
    const dedupeKey = `elegant:${method}:${endpoint}`;

    // Use rate limiter for the actual request
    return apiRateLimiter.enqueue(
      async () => {
        const response = await fetch(`${ELEGANT_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            ...this.getHeaders(true, userIdToUse),
            ...options.headers,
          },
        });

        if (response.status === 401) {
          // Token expired, re-authenticate
          await this.authenticate(userIdToUse);
          // Retry with bypass to avoid double queuing
          return this.request<T>(endpoint, options, clerkUserId, { bypassQueue: true });
        }

        if (response.status === 429) {
          const error = new Error(`Rate limit exceeded: ${response.status}`);
          (error as any).status = 429;
          throw error;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            endpoint
          });
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
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

  async get<T>(endpoint: string, clerkUserId?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, clerkUserId);
  }

  async post<T>(endpoint: string, data: any, clerkUserId?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, clerkUserId);
  }

  async put<T>(endpoint: string, data: any, clerkUserId?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, clerkUserId);
  }

  async patch<T>(endpoint: string, data: any, clerkUserId?: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, clerkUserId);
  }

  async delete<T>(endpoint: string, clerkUserId?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, clerkUserId);
  }

  async getCustomer(clerkUserId: string): Promise<CustomerResponse> {
    return this.get<CustomerResponse>('/customer', clerkUserId);
  }

  async createOrUpdateCustomer(clerkUserId: string, email: string, fullName: string): Promise<CustomerResponse> {
    await this.post<any>('/customer', {
      email,
      Full_name: fullName,
    }, clerkUserId);

    // Immediately fetch the customer data after creation/update
    return this.getCustomer(clerkUserId);
  }

  async signOutCustomer(clerkUserId: string): Promise<void> {
    return this.post<void>('/customer_signout', {}, clerkUserId);
  }

  async patchCustomer(clerkUserId: string, customerId: string, data: { cust_info: Record<string, any> }): Promise<any> {
    return this.patch(`/customer`, data, clerkUserId);
  }

  getToken(): string | null {
    return this.apiToken;
  }

  async submitFreeRaffleEntry(
    itemsId: number,
    email: string,
    fullName: string,
    mobileNumber?: string,
    clerkUserId?: string
  ): Promise<{ success: boolean; message?: string }> {
    const payload: { items_id: number; email: string; full_name: string; mobile_number?: string } = {
      items_id: itemsId,
      email,
      full_name: fullName,
    };
    if (mobileNumber) {
      payload.mobile_number = mobileNumber;
    }

    return this.post<{ success: boolean; message?: string }>('/raffle/entry', payload, clerkUserId);
  }

  // Public CRM endpoint for creating leads without authentication
  async createPublicLead(data: {
    name: string;
    email: string;
    payload: Record<string, any>;
  }): Promise<{ id?: number; success?: boolean }> {
    const CRM_API_URL = 'https://xv5d-psj5-v8tj.n7e.xano.io/api:K7PwNcIM/lead_new';

    const response = await fetch(CRM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        payload: data.payload,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create lead: ${errorText}`);
    }

    return response.json();
  }

  async getImages(search: string = "", page: number = 1, perPage: number = 25, itemType?: string): Promise<ImagesResponse> {
    const externalParams = { page, perPage };
    let url = `/images?external=${encodeURIComponent(JSON.stringify(externalParams))}&search=${encodeURIComponent(search)}`;
    if (itemType && itemType !== "all") {
      url += `&item_type=${encodeURIComponent(itemType)}`;
    }
    return this.get<ImagesResponse>(url);
  }

  async getShop(clerkUserId?: string): Promise<ShopResponse> {
    return this.get<ShopResponse>('/shop', clerkUserId);
  }

  async getItemDetails(itemSlug: string, clerkUserId?: string): Promise<ItemDetailsResponse> {
    const response = await this.get<ItemDetailsResponse[] | ItemDetailsResponse>(`/items_details/${itemSlug}`, clerkUserId);
    // API returns an array with one item, extract the first item
    return Array.isArray(response) ? response[0] : response;
  }

  async getItemDetailsById(itemId: number, clerkUserId?: string): Promise<ItemDetailsResponse> {
    const response = await this.get<ItemDetailsResponse[] | ItemDetailsResponse>(`/items_details/${itemId}`, clerkUserId);
    // API returns an array with one item, extract the first item
    return Array.isArray(response) ? response[0] : response;
  }

  // Workflow execution API methods
  async getWorkflowsBySlug(itemSlug: string, clerkUserId?: string): Promise<WorkflowTriggerResponse[]> {
    return this.get<WorkflowTriggerResponse[]>(`/workflows/${itemSlug}`, clerkUserId);
  }

  async getWorkflowActivitiesByItemsId(itemsId: number, clerkUserId?: string): Promise<WorkflowActivityResponse[]> {
    return this.get<WorkflowActivityResponse[]>(`/workflows_activities?items_id=${itemsId}`, clerkUserId);
  }

  async getWorkflowActivityDetails(activityId: number, clerkUserId?: string): Promise<WorkflowActivityDetailsResponse> {
    return this.get<WorkflowActivityDetailsResponse>(`/workflows_activities/${activityId}`, clerkUserId);
  }

  async getPublicItems(page: number = 1, perPage: number = 25, itemType?: string): Promise<PublicItemsResponse> {
    // Build query parameters for public items endpoint
    const externalParams = {
      page: page
    };

    // Use items_by_type endpoint for filtering by type
    if (itemType) {
      const endpoint = `/items_by_type/${itemType}?external=${encodeURIComponent(JSON.stringify(externalParams))}`;
      return this.get<PublicItemsResponse>(endpoint);
    }

    // Fallback to generic items endpoint if no type specified
    const endpoint = `/items?external=${encodeURIComponent(JSON.stringify(externalParams))}`;
    return this.get<PublicItemsResponse>(endpoint);
  }

  async getPublicProducts(page: number = 1): Promise<PublicItemsResponse> {
    return this.getPublicItems(page, 100, 'Product');
  }

  async getPublicMinerals(page: number = 1): Promise<PublicItemsResponse> {
    return this.getPublicItems(page, 100, 'Minerals');
  }

  async getPublicVendors(page: number = 1): Promise<PublicItemsResponse> {
    return this.get<PublicItemsResponse>(
      `/items_by_type/Vendors?external=${JSON.stringify({ page })}`
    );
  }

  async searchItems(query: string, page: number = 1, perPage: number = 10): Promise<SearchItemsResponse> {
    const externalParams = {
      page,
      per_page: perPage
    };
    return this.get<SearchItemsResponse>(
      `/items/${encodeURIComponent(query)}?external=${encodeURIComponent(JSON.stringify(externalParams))}`
    );
  }

  async searchItemsAll(searchQuery: string, page: number = 1): Promise<SearchItemsResponse> {
    const externalParams = { page, per_page: 25 };
    return this.get<SearchItemsResponse>(
      `/items/${encodeURIComponent(searchQuery)}?external=${encodeURIComponent(JSON.stringify(externalParams))}`
    );
  }

  async getStripeKey(clerkUserId?: string): Promise<{ secret_value: string }> {
    return this.get<{ secret_value: string }>('/shop_secret/Stripe', clerkUserId);
  }

  async createStripeCheckoutSession(
    lineItems: Array<{
      price_data: {
        currency: string;
        product_data: {
          name: string;
          description?: string;
          images?: string[];
        };
        unit_amount: number;
        recurring?: {
          interval: string;
          interval_count: number;
        };
      };
      quantity: number;
    }>,
    successUrl: string,
    cancelUrl: string,
    clerkUserId?: string,
    mode: 'payment' | 'subscription' = 'payment',
    bookingsId?: number
  ): Promise<{ id: string; url: string;[key: string]: any }> {
    await this.authenticate();

    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };

    if (clerkUserId) {
      headers['x-elegant-userid'] = clerkUserId;
    }

    const body: Record<string, any> = {
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: lineItems,
      mode,
    };

    if (bookingsId) {
      body.bookings_id = bookingsId;
    }

    const response = await fetch(`${STRIPE_BASE_URL}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Stripe checkout session: ${errorText}`);
    }

    return await response.json();
  }

  // Cart Items API Methods
  async getCartItems(clerkUserId: string): Promise<CartItemsResponse> {
    return this.get<CartItemsResponse>('/cart_items', clerkUserId);
  }

  async addCartItem(clerkUserId: string, itemData: {
    items_id: number;
    price: number;
    quantity: number;
    bookings_info?: Record<string, any>;
  }): Promise<any> {
    return this.post('/cart_items', itemData, clerkUserId);
  }

  async updateCartItem(clerkUserId: string, cartItemId: string, itemData: {
    price: number;
    quantity: number;
  }): Promise<any> {
    return this.patch(`/cart_items/${cartItemId}`, {
      cart_items_id: cartItemId,
      ...itemData
    }, clerkUserId);
  }

  async deleteCartItem(clerkUserId: string, cartItemId: string): Promise<any> {
    return this.delete(`/cart_items/${cartItemId}`, clerkUserId);
  }

  async clearCart(clerkUserId: string): Promise<any> {
    const cartItemsResponse = await this.getCartItems(clerkUserId);
    const deletePromises = cartItemsResponse.items.map((item: any) =>
      this.deleteCartItem(clerkUserId, item.id)
    );
    return Promise.all(deletePromises);
  }

  async getBookings(clerkUserId: string, page: number = 1, perPage: number = 25): Promise<BookingsResponse> {
    const params = JSON.stringify({ page, per_page: perPage });
    return this.get<BookingsResponse>(`/booking?external=${encodeURIComponent(params)}`, clerkUserId);
  }

  async updateBookingStatus(clerkUserId: string, bookingId: number, status: string): Promise<any> {
    return this.patch(`/booking/${bookingId}`, { status }, clerkUserId);
  }

  async getMembershipBookings(clerkUserId: string): Promise<MembershipBookingsResponse> {
    return this.get<MembershipBookingsResponse>('/booking/items/Membership', clerkUserId);
  }

  async getConversations(clerkUserId: string, page: number = 1, perPage: number = 25): Promise<ConversationsResponse> {
    const params = JSON.stringify({ page, per_page: perPage });
    return this.get<ConversationsResponse>(`/conversation?external=${encodeURIComponent(params)}`, clerkUserId);
  }

  async createConversation(clerkUserId: string, topic: string): Promise<Conversation> {
    return this.post<Conversation>('/conversation', { topic }, clerkUserId);
  }

  async getConversationDetails(clerkUserId: string, conversationId: number): Promise<ConversationDetails> {
    return this.get<ConversationDetails>(`/conversation/${conversationId}`, clerkUserId);
  }

  async replyToConversation(clerkUserId: string, conversationId: number, topic: string): Promise<any> {
    return this.post<any>(`/conversation/${conversationId}`, { topic }, clerkUserId);
  }

  async getSharableLinks(itemsId: number, baseUrl?: string, leadsId?: number, campaignItemsId?: number): Promise<SharableLinksResponse> {
    const encodedBaseUrl = baseUrl ? encodeURIComponent(baseUrl) : '';
    const leadsIdParam = leadsId ?? 0;
    const campaignItemsIdParam = campaignItemsId ?? 0;
    return this.get<SharableLinksResponse>(`/items_sharable_links/${itemsId}?base_url=${encodedBaseUrl}&leads_id=${leadsIdParam}&campaign_items_id=${campaignItemsIdParam}`);
  }

  async getMemberDashboardAnalytics(clerkUserId?: string): Promise<MemberDashboardAnalyticsResponse> {
    return this.get<MemberDashboardAnalyticsResponse>('/dashboard/get_analytics', clerkUserId);
  }

  async getApplications(
    clerkUserId: string,
    params: {
      page?: number;
      perPage?: number;
      booking_slug?: string;
      search?: string | null;
      status?: string | null;
      booking_type?: string | null;
      items_type?: string | null;
      start_date?: string | null;
      end_date?: string | null;
    } = {}
  ): Promise<BookingsResponse> {
    const queryParams = new URLSearchParams();

    // Use external parameter for pagination
    const external = JSON.stringify({
      page: params.page || 1,
      perPage: params.perPage || 25
    });
    queryParams.append('external', external);

    if (params.booking_type) queryParams.append('booking_type', params.booking_type);
    if (params.items_type) queryParams.append('items_type', params.items_type);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.booking_slug) queryParams.append('booking_slug', params.booking_slug);

    return this.get<BookingsResponse>(`/applications?${queryParams.toString()}`, clerkUserId);
  }

  async getApplicationDetails(clerkUserId: string, bookingSlug: string): Promise<Booking | null> {
    const response = await this.get<{ items: Booking[] }>(`/application/${bookingSlug}`, clerkUserId);
    return response.items?.[0] || null;
  }

  async createWorkflowLog(logData: WorkflowLogRequest): Promise<WorkflowLogResponse> {
    return this.post<WorkflowLogResponse>('/workflows_logs', logData);
  }

  // Server-side throttle check and execution recording
  // Returns whether execution is allowed and records it if so
  async checkAndRecordThrottle(request: ThrottleExecuteRequest): Promise<ThrottleExecuteResponse> {
    try {
      return await this.post<ThrottleExecuteResponse>('/workflows_throttle/execute', request);
    } catch (error) {
      console.error('[ElegantAPI] Throttle check failed:', error);
      // On error, allow execution (fail-open) but don't record
      return { allowed: true, recorded: false };
    }
  }

  // Get throttle status without recording an execution
  async getThrottleStatus(workflowEventLogId: number): Promise<ThrottleStatusResponse> {
    try {
      return await this.get<ThrottleStatusResponse>(`/workflows_throttle/status/${workflowEventLogId}`);
    } catch (error) {
      console.error('[ElegantAPI] Throttle status check failed:', error);
      // On error, return allowed state
      return { allowed: true };
    }
  }

  // Delete/reset a throttle record to allow re-execution
  async deleteThrottle(workflowEventLogId: number): Promise<{ success: boolean }> {
    try {
      await this.delete(`/workflows_throttle/${workflowEventLogId}`);
      return { success: true };
    } catch (error) {
      console.error('[ElegantAPI] Throttle delete failed:', error);
      return { success: false };
    }
  }

  // Bulk reset server-side throttles for a workflow
  async resetWorkflowThrottles(workflowId: number): Promise<{ success: boolean; count?: number }> {
    try {
      const response = await this.delete<{ success: boolean; count?: number }>(
        `/workflows_throttle/reset_all?workflow_id=${workflowId}`
      );
      return response || { success: true };
    } catch (error) {
      console.error('[ElegantAPI] Bulk throttle reset failed:', error);
      return { success: false };
    }
  }
}

export interface WorkflowLogRequest {
  workflows_items_id: number;
  items_id: number;
  items_slug: string;
  log: Record<string, any>;
  item_type?: string; // Top-level item type (event, class, etc.)
  event?: string; // Top-level trigger event (view, purchase, etc.)
}

export interface WorkflowLogResponse {
  id?: number;
  success?: boolean;
}

export interface SharableLinksResponse {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
  email?: string;
  copylink?: string;
  [key: string]: string | undefined;
}

export interface Conversation {
  id: number;
  created_at: number;
  topic: string;
  last_message_at: number;
  messages_count: number;
  participants_count: number;
}

export interface MessageCustomer {
  id: string;
  created_at: number;
  elegant_user_id: string;
  customer_number: number;
  Full_name: string;
  is_online_now: boolean;
  is_online_timestamp: number;
  is_blocked_or_denied: boolean;
  email: string;
  cust_info: any;
}

export interface ConversationMessage {
  id: number;
  created_at: number;
  sender_customer_id: string;
  message_text: string;
  message_type: string;
  _customers?: MessageCustomer;
}

export interface ConversationDetails {
  id: number;
  created_at: number;
  shops_id: string;
  topic: string;
  last_message_at: number;
  customers_id: string;
  _messages: {
    items: ConversationMessage[];
  };
}

export interface ConversationsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: Conversation[];
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

export interface MembershipBookingsResponse {
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

export interface PublicItem {
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
  item_info?: any;
  rank?: number;
  min_quantity?: number;
  item_attributes?: any;
}

export interface PublicItemsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: PublicItem[];
}

export interface SearchItemsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  items: Array<PublicItem & {
    _item_images_of_items?: {
      items: Array<{
        id: number;
        shops_id: string;
        items_id: number;
        created_at: number;
        display_image: string;
        seq: number;
        image_type: 'Image' | 'Video' | 'YouTube';
        Is_disabled: boolean;
      }>;
      itemsReceived: number;
      curPage: number;
      nextPage: number | null;
      prevPage: number | null;
      offset: number | null;
      perPage: number | null;
    };
    _action_buttons_of_items?: any[];
    _shops?: {
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
    };
  }>;
}

export interface ItemDetailsResponse {
  id: number;
  created_at: number;
  title: string;
  description: string;
  slug: string;
  item_type: string;
  item_info: any;
  tags: string;
  SEO_Tags: string;
  Is_disabled: boolean;
  price?: number;
  currency?: string;
  max_quantity?: number;
  unit?: string;
  sku?: string;
  _item_images_of_items?: {
    items: Array<{
      id: number;
      shops_id: string;
      items_id: number;
      created_at: number;
      display_image: string;
      seq: number;
      image_type: 'Image' | 'Video' | 'YouTube';
      Is_disabled: boolean;
      mediafiles_id: number | null;
    }>;
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number | null;
    perPage: number | null;
  };
  _action_buttons_of_items?: any[];
  _reviews_item_total?: number;
}

export interface CustomerResponse {
  customer: ElegantCustomer;
  authToken: string;
}

export interface ElegantCustomer {
  id: string;
  created_at: number;
  elegant_user_id: string;
  external_dashbord_token: string;
  external_shopping_cart: string;
  external_settings: string;
  external_token: string;
  customer_number: number;
  Full_name: string;
  cust_info: Record<string, any> | null;
  is_online_now: boolean;
  is_online_timestamp: number;
  is_blocked_or_denied: boolean;
  email: string;
  _shops: {
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
    _shop_info?: {
      id: string;
      created_at: number;
      shops_id: string;
      title: string;
      description: string;
      logo: string;
      seo_script_text: string;
      contact_info: any;
      shops_settings: any;
      max_emails_per_day?: number;
      email_contact_days_freq?: number;
      from_email?: string;
    };
  };
  _customer_role: {
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
    cust_role_info: any;
    is_manager: boolean;
    is_owner: boolean;
  };
}

export interface MediaItem {
  id: string;
  created_at: number;
  shops_id: string;
  image_type: 'Image' | 'Video';
  title?: string;
  description?: string;
  tags?: string;
  media_info: Record<string, any>;
  media_attributes: Record<string, any>;
  seq: number;
  customers_id: string | null;
  modified_by_id: string | null;
  YouTubeurl: string;
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
  attachments: any;
  _item_images_of_mediafiles: number;
}

export interface ImagesResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: MediaItem[];
}

export interface ShopResponse {
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
  _shop_info?: {
    id: string;
    created_at: number;
    shops_id: string;
    title: string;
    description: string;
    logo: string;
    seo_script_text: string;
    contact_info: any;
    shops_settings: any;
    max_emails_per_day?: number;
    email_contact_days_freq?: number;
    from_email?: string;
  };
}

export interface CartItemsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: Array<{
    id: string;
    created_at: number;
    shops_id: string;
    cart_user_id: string;
    items_id: number;
    price: number;
    action_id: number | null;
    action_type: string;
    quantity: number;
    booking_slug: string;
    bookings_id: number;
    Modified_date: number | null;
    _customers: {
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
      item_info: any;
      rank: number;
      min_quantity: number;
      item_attributes: any;
      customers_id: string | null;
      modified_by_id: string | null;
    };
  }>;
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
    item_info: any;
    rank: number;
    min_quantity: number;
    item_attributes: Record<string, any>;
    customers_id: string | null;
    modified_by_id: string;
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

export interface Booking {
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
  _customers: {
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
  // Lead information when available
  _leads?: LeadInfo;
}

export interface BookingsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  itemsTotal: number;
  pageTotal: number;
  items: Booking[];
}

// Member Dashboard Analytics Types
export interface BookingTypeMetric {
  booking_types: string;
  bookings: number;
  booking_status: string[];
}

export interface BookingItemMetric {
  booking_items: string;
  bookings: number;
  price: number;
  quantity: number;
}

export interface ItemCategoryMetric {
  items_item_types: string;
  count: number;
  total_item_price: number;
  items_currency: string[];
}

export interface CampaignActivityMetric {
  status: string;
  count: number;
  leads: number;
  activity_date: number[];
}

export interface TaskMetric {
  tasks_status: string;
  tasks_count: number;
  tasks_type: string[];
  tasks_created_at: number[];
  tasks_due_date: (number | null)[];
  tasks_assigned_customers_id: (string | null)[];
}

export interface MemberDashboardAnalyticsResponse {
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
      total_booking_types: BookingTypeMetric[];
      new_booking_types: BookingTypeMetric[];
      total_booking_items: BookingItemMetric[];
      new_booking_items: BookingItemMetric[];
    };
    customers: {
      total: number | null;
      new: number | null;
    };
    leads: {
      total: number;
      new: number;
    };
    reviews: {
      total: number;
      new: number;
      ratings: any[];
      new_ratings: any[];
    };
    item_types: {
      total: number;
      items: ItemCategoryMetric[];
      new_items: ItemCategoryMetric[];
    };
    campaign_activity: {
      total: CampaignActivityMetric[];
      new: CampaignActivityMetric[];
    };
    tasks: {
      total: TaskMetric[];
      new_total: TaskMetric[];
      new: TaskMetric[];
    };
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

// Workflow execution types
export interface WorkflowTriggerThrottle {
  enabled: boolean;
  scope: 'session' | 'day' | 'week' | 'lifetime' | 'none';
  target: 'browser' | 'user' | 'both';
  maxExecutions?: number;
  cooldownMinutes?: number;
  version?: number; // Bump to invalidate all browser caches
  resetAt?: number; // Unix timestamp - invalidate caches older than this
}

export interface WorkflowTriggerResponse {
  id: number;
  created_at: number;
  shops_id: string;
  workflow_items_id: number;
  items_type: string;
  event_name: string;
  seq: number;
  event_info?: {
    throttle?: WorkflowTriggerThrottle;
  };
}

export interface WorkflowActivityResponse {
  id: number;
  created_at: number;
  name: string;
  description?: string;
}

export interface WorkflowActivityDetailsResponse {
  id: number;
  created_at: number;
  shops_id: string;
  items_id: number;
  name: string;
  description?: string;
  activity_info: {
    nodeId?: string;
    routes?: any[];
    actions?: any[];
    position?: { x: number; y: number };
    action_id?: string;
  };
}

export const elegantAPI = new ElegantAPI();
