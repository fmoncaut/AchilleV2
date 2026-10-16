# Feature Specification: Akwire Mobile Marketplace

**Feature Branch**: `001-akwire-marketplace`  
**Created**: 2025-11-21  
**Status**: Draft  
**Input**: User description: "Build Akwire mobile marketplace application for local product discovery and reservation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Location-Based Product Discovery (Priority: P1)

A user opens the app and immediately sees products available at nearby stores based on their location, allowing them to browse without creating an account or logging in.

**Why this priority**: This is the core value proposition - connecting users with local inventory. Without this, the app has no purpose. This can be delivered as a standalone browsing experience.

**Independent Test**: Can be fully tested by opening the app, granting location permission, and verifying that products from nearby stores appear with distance information. Delivers immediate value by showing available inventory.

**Acceptance Scenarios**:

1. **Given** a user opens the app for the first time, **When** they grant location permission, **Then** the app displays products from stores within 50km radius with distance shown for each product
2. **Given** a user is browsing products, **When** they adjust the distance radius slider (1-50km), **Then** the product list updates to show only products from stores within the new radius
3. **Given** a user views a product, **When** they check availability, **Then** they see all stores carrying the product with prices and distances
4. **Given** a user's location changes by more than 1km, **When** they pull to refresh, **Then** the product feed updates to show inventory from stores near the new location
5. **Given** a user denies location permission, **When** prompted, **Then** they can manually enter a city/address to see products from that area

---

### User Story 2 - Product Search and Filtering (Priority: P1)

A user can search for specific products by text, barcode scanning, or filtering by categories, stores, and price range to quickly find what they need.

**Why this priority**: Essential for users who know what they want. Combined with discovery (P1), this completes the basic product finding experience. Can function independently of user accounts.

**Independent Test**: Can be tested by searching for products via text input or barcode scan, applying filters, and verifying results match the criteria. Delivers value for targeted shoppers.

**Acceptance Scenarios**:

1. **Given** a user taps the search icon, **When** they type at least 3 characters, **Then** relevant products appear in real-time with result count displayed
2. **Given** a user taps the scan icon, **When** they point the camera at a product barcode, **Then** the app recognizes the barcode and navigates to the product detail page
3. **Given** a user is viewing search results, **When** they apply filters (category, store, price range), **Then** results update to match all selected criteria
4. **Given** a user applies multiple filters, **When** they tap "Reset filters", **Then** all filters clear and full results display
5. **Given** a user scans an unknown barcode, **When** the product is not found, **Then** they see a clear error message with option to search manually

---

### User Story 3 - User Onboarding and Account Creation (Priority: P2)

A new user completes a guided onboarding flow where they create an account, select category interests, set their location, and configure notification preferences for personalized experiences.

**Why this priority**: Required before users can purchase, but not needed for browsing. Enables personalization and unlocks cart/checkout features. Must be pleasant to minimize drop-off.

**Independent Test**: Can be tested by completing the full onboarding sequence from app install through first login, verifying all preferences are saved and applied. Delivers personalized feed.

**Acceptance Scenarios**:

1. **Given** a first-time user opens the app, **When** they complete the welcome carousel and tap "Get Started", **Then** they proceed to account creation
2. **Given** a user is creating an account, **When** they provide email/password or use Facebook login and accept terms, **Then** their account is created and they proceed to category selection
3. **Given** a user reaches category selection, **When** they select 1-5 preferred categories from the 12 available options, **Then** selected categories show checkmarks and they can proceed
4. **Given** a user reaches location setup, **When** they tap "Use my location" and grant permission, **Then** their location is detected and they proceed to notifications
5. **Given** a user reaches notification setup, **When** they choose to enable or skip, **Then** their preference is saved and they enter the main app with personalized feed
6. **Given** a user completes onboarding, **When** they view the home feed, **Then** products are filtered to their selected categories and location

---

### User Story 4 - Shopping Cart and Single-Store Checkout (Priority: P2)

A logged-in user can add products to their cart from a single store, review their order, provide billing address, and complete payment to reserve products for in-store pickup.

**Why this priority**: This is the revenue-generating action. Must work flawlessly but can only be tested after authentication (P2) exists. Cart restrictions are critical business rules.

**Independent Test**: Can be tested by adding products to cart, proceeding through checkout steps, completing payment, and verifying order confirmation. Delivers transactional value.

**Acceptance Scenarios**:

1. **Given** a logged-in user views a product, **When** they tap "Add to cart" and select quantity, **Then** the product is added and cart badge shows item count
2. **Given** a user has items in cart from Store A, **When** they try to add a product from Store B, **Then** they see a dialog offering to clear cart or cancel
3. **Given** a user views their cart, **When** they tap "Order" button, **Then** they proceed to billing address step
4. **Given** a user enters billing information, **When** they proceed to payment with valid card details, **Then** payment processes and order confirmation displays
5. **Given** a guest user tries to add to cart, **When** they tap "Add to cart", **Then** they see a login prompt and can authenticate to continue
6. **Given** a user completes checkout, **When** payment succeeds, **Then** they see order number, store pickup details, and success animation

---

### User Story 5 - Order Management and Tracking (Priority: P3)

A user can view all their orders, check order status, see pickup details, and access store information for completed and active orders.

**Why this priority**: Important for post-purchase experience but dependent on checkout (P2) existing first. Enhances trust and reduces support needs.

**Independent Test**: Can be tested by placing an order (via P2), viewing order history, checking status updates, and accessing order details. Delivers post-purchase value.

**Acceptance Scenarios**:

1. **Given** a user has placed orders, **When** they tap the Orders icon, **Then** they see a list of all orders sorted by date with status badges
2. **Given** a user views order list, **When** they tap on an order, **Then** they see full order details including products, store info, total price, and QR code
3. **Given** an order status changes, **When** the update occurs, **Then** the status badge and timeline update in the order detail view
4. **Given** a user views order details, **When** they tap "Get directions", **Then** the device maps app opens with navigation to the store
5. **Given** a user has no orders, **When** they view the Orders tab, **Then** they see an empty state with "Start shopping" call-to-action

---

### User Story 6 - Push Notifications and Deal Alerts (Priority: P3)

A user receives timely push notifications for order status changes, price drops on saved items, and deals in their preferred categories near their location.

**Why this priority**: Drives engagement and repeat usage but requires core features (P1-P2) to be valuable. Notifications without products/orders to notify about are pointless.

**Independent Test**: Can be tested by configuring notification preferences, triggering various events (order updates, new deals), and verifying notifications appear. Delivers engagement value.

**Acceptance Scenarios**:

1. **Given** a user enabled notifications during onboarding, **When** their order status changes to "Ready for pickup", **Then** they receive a push notification
2. **Given** a user has selected "Electronics" as an interest, **When** a new discounted electronics product appears nearby, **Then** they receive a deal alert notification
3. **Given** a user taps a notification, **When** the app opens, **Then** they navigate directly to the relevant order or product
4. **Given** a user changes category preferences in settings, **When** they disable "Sports" notifications, **Then** they stop receiving sports deal alerts
5. **Given** a user has not granted notification permission, **When** they view notification settings, **Then** they see instructions to enable in device settings

---

### User Story 7 - User Profile and Settings Management (Priority: P4)

A user can view and edit their personal information, saved addresses, category preferences, location settings, notification preferences, and payment methods through organized settings menus.

**Why this priority**: Important for long-term user experience but not critical for initial transactions. Users can function with minimal profile data. Enhances convenience.

**Independent Test**: Can be tested by accessing settings, updating various preferences, and verifying changes persist and affect app behavior. Delivers personalization control.

**Acceptance Scenarios**:

1. **Given** a user taps the Profile tab, **When** they access "Account" settings, **Then** they can view and edit personal information, billing address, and password
2. **Given** a user accesses Settings, **When** they tap "Category interests", **Then** they see the same category grid from onboarding and can modify selections
3. **Given** a user updates their category preferences, **When** they return to the home feed, **Then** products are filtered to reflect new category selections
4. **Given** a user accesses Settings, **When** they adjust location or search radius, **Then** product distances recalculate and results update
5. **Given** a user wants to delete their account, **When** they access account settings and confirm deletion, **Then** all their data is deleted within 30 days per GDPR

---

### User Story 8 - Favorites and Wishlists (Priority: P4)

A user can save products and stores to their favorites for quick access and future reference, organized into separate tabs for products and stores.

**Why this priority**: Nice-to-have feature that enhances browsing experience but not essential for core transactions. Works best after users are familiar with the app.

**Independent Test**: Can be tested by adding/removing items from favorites, viewing favorites list, and verifying persistence across sessions. Delivers bookmark convenience.

**Acceptance Scenarios**:

1. **Given** a user views a product, **When** they tap the heart icon, **Then** the product is added to favorites with animation and icon fills
2. **Given** a user has favorited products, **When** they access the Favorites tab, **Then** they see all saved products in large cards with product details
3. **Given** a user switches to "Stores" tab in Favorites, **When** viewing the list, **Then** they see all favorited stores with distance and product count
4. **Given** a user taps a heart icon on a favorited item, **When** the icon is tapped again, **Then** the item is removed from favorites with animation
5. **Given** a user has no favorites, **When** they view the Favorites tab, **Then** they see an empty state with call-to-action to discover products

---

### Edge Cases

- **Location Permission Denied**: What happens when user denies location permission but location is critical for app functionality? System allows manual city entry as fallback, shows persistent banner suggesting to enable location, provides settings deep-link.

- **No Nearby Stores**: How does the system handle users in areas with no participating stores within maximum radius? Display empty state with suggestion to increase search radius, show message explaining limited coverage, provide option to browse without location restriction.

- **Product Out of Stock During Checkout**: What happens when product becomes unavailable between adding to cart and completing payment? System validates stock before payment processing, shows clear error message, removes unavailable items from cart, allows user to continue with remaining items.

- **Network Connectivity Loss**: How does the app behave when internet connection is lost mid-session? Display offline banner at top, prevent cart/checkout actions, show cached content where possible, queue actions for when connection returns.

- **Barcode Scan Failures**: What happens when barcode cannot be recognized or product not in system? Show clear error message "Product not found", offer manual search option, provide retry scanning option, log unknown barcodes for analysis.

- **Multiple Devices/Sessions**: How does system handle user logged in on multiple devices simultaneously? Allow concurrent sessions, sync cart and favorites across devices, handle concurrent cart modifications gracefully, use latest device for location-based content.

- **Payment Failure**: What happens when payment processing fails during checkout? Show clear error message explaining failure reason, allow user to retry with same or different payment method, do not reserve inventory until payment succeeds, preserve cart contents.

- **Order Cancellation After Payment**: How are refunds handled when store must cancel an order? Store initiates cancellation with reason, user receives notification, refund processes to original payment method, order status updates to "Cancelled" with explanation.

- **Store Closure/Hours Outside Pickup Window**: What happens when store closes or changes hours after order placed? System validates store hours before allowing order, shows warning if close to closing time, notifies user if hours change after order, provides customer support contact.

- **Invalid or Expired Barcode**: How does system handle barcodes that are valid format but not in database? Distinguish between unreadable vs unknown barcodes, offer to report unknown products to improve catalog, suggest browsing similar categories, provide manual search.

## Requirements *(mandatory)*

### Functional Requirements

**User Management**:
- **FR-001**: System MUST allow users to browse products without creating an account (guest mode)
- **FR-002**: System MUST support user registration via email/password with validation
- **FR-003**: System MUST support Facebook social login as alternative registration method
- **FR-004**: System MUST provide password reset functionality via email verification
- **FR-005**: System MUST persist user sessions and support auto-login on app reopen
- **FR-006**: System MUST require user login before adding items to cart or completing checkout
- **FR-007**: System MUST allow users to delete their account with all associated data per GDPR requirements

**Onboarding**:
- **FR-008**: System MUST present multi-step guided onboarding for first-time users including welcome, registration, category selection, location setup, and notification configuration
- **FR-009**: System MUST allow users to select 1 or more product category interests from a predefined list of 12 categories
- **FR-010**: System MUST store category preferences and use them to personalize product feed (prioritize selected categories in "Recommandé pour toi" section with 70% weight) and notifications (subscribe to category-specific FCM topics)
- **FR-011**: System MUST allow users to skip optional onboarding steps (notifications) without blocking app access
- **FR-012**: System MUST save all onboarding preferences to user profile for future reference

**Location Services**:
- **FR-013**: System MUST request and handle location permissions with clear explanation of value
- **FR-014**: System MUST detect user's current location when permission is granted
- **FR-015**: System MUST allow manual city/address entry as fallback when location permission is denied
- **FR-016**: System MUST display user's current location (city/region) prominently in app header
- **FR-017**: System MUST calculate and display distance from user to each store in kilometers
- **FR-018**: System MUST support adjustable search radius from 1km to 50km with default of 50km
- **FR-019**: System MUST update product listings when user location changes by more than 1km
- **FR-020**: System MUST filter all products to show only those from stores within selected radius

**Product Discovery**:
- **FR-021**: System MUST display product feed with curated product sections organized by categories
- **FR-022**: System MUST show horizontal scrolling category pills for quick navigation
- **FR-023**: System MUST display products in 2-column grid layout with product images, titles, prices, and distances
- **FR-024**: System MUST support infinite scroll pagination loading 24 products per page
- **FR-025**: System MUST support pull-to-refresh gesture to reload product feed
- **FR-026**: System MUST prioritize products from user's selected category interests in recommendations

**Search and Filtering**:
- **FR-027**: System MUST provide text search across product names, descriptions, brands, and categories
- **FR-028**: System MUST require minimum 3 characters to trigger search and return results in real-time
- **FR-029**: System MUST provide barcode scanning capability using device camera
- **FR-030**: System MUST support EAN and UPC barcode formats for product lookup
- **FR-031**: System MUST navigate directly to product detail page after successful barcode scan
- **FR-032**: System MUST provide comprehensive filter modal with options for: sort order, stores, categories, and price range
- **FR-033**: System MUST support multi-select filtering for stores and categories
- **FR-034**: System MUST apply filters using AND logic (all criteria must match)
- **FR-035**: System MUST show active filter count badge and allow one-tap reset
- **FR-036**: System MUST handle no results scenario with helpful suggestions and retry options

**Product Details**:
- **FR-037**: System MUST display comprehensive product information including images, title, description, condition, brand, and SKU
- **FR-038**: System MUST show product image gallery with swipeable carousel and pagination dots
- **FR-039**: System MUST display current price, original price (if discounted), and discount percentage
- **FR-040**: System MUST show multi-store pricing with list of all stores carrying the product
- **FR-041**: System MUST sort store list by distance from user by default
- **FR-042**: System MUST display stock availability indicator per store
- **FR-043**: System MUST differentiate between POS products (in-app purchase) and WEB products (external redirect)
- **FR-044**: System MUST show "Add to cart" button for POS products and "View offer" button for WEB products
- **FR-045**: System MUST open external browser when user taps "View offer" for WEB products

**Shopping Cart**:
- **FR-046**: System MUST allow authenticated users to add products to cart with quantity selection
- **FR-047**: System MUST enforce single-store cart restriction (all items must be from same store)
- **FR-048**: System MUST show clear dialog when user attempts to add item from different store with: warning icon, message "Votre panier contient des articles de [Store A]. Voulez-vous vider votre panier pour ajouter cet article de [Store B]?", two buttons: "Vider le panier" (destructive/red) and "Annuler" (default)
- **FR-049**: System MUST display cart badge with item count on navigation bar
- **FR-050**: System MUST allow users to adjust quantities and remove items from cart
- **FR-051**: System MUST validate product stock availability in real-time before checkout
- **FR-052**: System MUST show cart with store information, product list, and total price
- **FR-053**: System MUST persist cart contents across app sessions
- **FR-054**: System MUST show maximum quantity limits based on available stock

**Checkout and Payment**:
- **FR-055**: System MUST provide multi-step checkout flow: cart review, billing address, payment, confirmation
- **FR-056**: System MUST collect and validate billing address including street, postal code, city, and phone number
- **FR-057**: System MUST pre-fill billing address from user profile if previously saved
- **FR-058**: System MUST integrate with Stripe for secure payment processing (using Stripe SDK with separate test and production API keys; webhook endpoints for payment_intent.succeeded, payment_intent.failed configured at /api/webhooks/stripe)
- **FR-059**: System MUST support credit card payments (Visa, Mastercard, etc.) via Stripe
- **FR-060**: System MUST validate payment information in real-time with clear error feedback
- **FR-061**: System MUST require acceptance of terms and conditions before payment
- **FR-062**: System MUST display total price including VAT (TTC) throughout checkout
- **FR-063**: System MUST show loading state during payment processing and disable interaction
- **FR-064**: System MUST display order confirmation with order number, summary, and success animation
- **FR-065**: System MUST reserve inventory only after successful payment completion

**Order Management**:
- **FR-066**: System MUST generate unique order number for each completed transaction
- **FR-067**: System MUST support order status states: Pending Payment, Validation, Confirmed, Completed, Cancelled
- **FR-068**: System MUST display order list with status badges, store information, and order dates
- **FR-069**: System MUST support filtering orders by status (Active, Completed, Cancelled)
- **FR-070**: System MUST provide detailed order view showing all products, quantities, prices, and pickup information
- **FR-071**: System MUST display store contact information and provide "Get directions" button
- **FR-072**: System MUST generate QR code containing order number for order verification at pickup
- **FR-073**: System MUST update order status in real-time when changes occur
- **FR-074**: System MUST maintain complete order history for user reference

**Notifications**:
- **FR-075**: System MUST integrate with Firebase Cloud Messaging for push notifications
- **FR-076**: System MUST support notification types: Order Updates, Deal Alerts, Promotional Content
- **FR-077**: System MUST send order status notifications when orders change state
- **FR-078**: System MUST send deal alerts for discounted products in user's selected categories
- **FR-079**: System MUST support topic-based subscriptions for categories, locations, and stores
- **FR-080**: System MUST allow users to manage notification preferences per category and store
- **FR-081**: System MUST keep order notifications always enabled (non-optional)
- **FR-082**: System MUST navigate to relevant content (order/product) when user taps notification
- **FR-083**: System MUST handle notification permission denied gracefully with re-enable option

**Favorites**:
- **FR-084**: System MUST allow users to save products to favorites via heart icon
- **FR-085**: System MUST allow users to save stores to favorites
- **FR-086**: System MUST organize favorites into separate tabs for Products and Stores
- **FR-087**: System MUST persist favorites across sessions and devices
- **FR-088**: System MUST show count badges on favorite tabs
- **FR-089**: System MUST provide empty state with call-to-action when no favorites exist

**Settings and Preferences**:
- **FR-090**: System MUST provide settings menu accessible from Profile tab
- **FR-091**: System MUST allow users to update personal information including name, phone, and address
- **FR-092**: System MUST allow users to change password with current password verification
- **FR-093**: System MUST allow users to modify category interest selections post-onboarding
- **FR-094**: System MUST allow users to change location and search radius settings
- **FR-095**: System MUST allow users to manage payment methods (add, remove, set default)
- **FR-096**: System MUST provide help menu with FAQ, bug reporting, terms, privacy policy, and cookie information

**Analytics and Tracking**:
- **FR-097**: System MUST track key user events including page views, product views, add to cart, searches, and purchases
- **FR-098**: System MUST follow e-commerce analytics standards for event structure
- **FR-099**: System MUST respect user privacy settings and GDPR compliance
- **FR-100**: System MUST not log personally identifiable information (PII) in analytics

**Performance and UX**:
- **FR-101**: System MUST show loading states for operations exceeding 100ms (API calls, database queries, image processing, navigation transitions, payment processing)
- **FR-102**: System MUST provide skeleton screens during initial content load
- **FR-103**: System MUST show appropriate error messages with actionable recovery steps
- **FR-104**: System MUST provide haptic feedback for key actions (add to cart, payment success)
- **FR-105**: System MUST support pull-to-refresh on all list views
- **FR-106**: System MUST implement progressive image loading with low-quality placeholders
- **FR-107**: System MUST lazy-load images as user scrolls
- **FR-108**: System MUST cache frequently accessed data (profile, recent products, location)

**Accessibility and Internationalization**:
- **FR-109**: System MUST support English language as primary language for all UI text and content with EUR currency format (€) and DD/MM/YYYY date format
- **FR-109a**: System MUST support French language as secondary language option for European market
- **FR-109b**: System MUST format phone numbers in international format supporting worldwide phone number standards
- **FR-109c**: System MUST structure localization to enable future expansion to Belgium (French + Dutch), Switzerland (French + German), Spain (Spanish), and UK (English) markets
- **FR-109d**: System MUST use slang package (^4.11.0) for type-safe internationalization with compile-time validation and JSON-based translation files
- **FR-109e**: System MUST maintain translation files in structured JSON format allowing easy addition of new languages and market-specific content
- **FR-110**: System MUST provide proper accessibility labels for screen readers (VoiceOver/TalkBack)
- **FR-111**: System MUST ensure minimum touch target sizes of 44pt × 44pt (iOS) or 48dp × 48dp (Android)
- **FR-112**: System MUST support dynamic type for user font size preferences
- **FR-113**: System MUST meet WCAG AA contrast ratio standards (4.5:1 for text)
- **FR-114**: System MUST respect system accessibility settings (reduce motion, increase contrast)

**Security and Privacy**:
- **FR-115**: System MUST store authentication tokens securely using Keychain (iOS) or Keystore (Android)
- **FR-116**: System MUST use TLS 1.3+ for all network communication
- **FR-117**: System MUST never store credit card information locally (handled by Stripe)
- **FR-118**: System MUST provide clear privacy policy accessible during onboarding and in help menu
- **FR-119**: System MUST support complete account deletion including all user data
- **FR-120**: System MUST handle user data according to GDPR and CCPA requirements

### Key Entities

- **User**: Represents a registered user account with email, password, name, phone number, billing address, category preferences, location settings, notification preferences, and FCM token. Related to Orders, Favorites, and Cart.

- **Product**: Represents an item available for purchase with title, description, brand, SKU, images, condition (new/used/refurbished), category, and type (POS/WEB). Related to multiple ProductStoreListings and can be in Cart or Favorites.

- **Store**: Represents a physical retail location with name, logo, address, phone number, opening hours, geolocation coordinates, and participating status. Related to ProductStoreListings and Orders.

- **ProductStoreListing**: Represents specific product availability at a specific store with price, public/list price, stock quantity, and availability status. Links Product to Store with pricing.

- **Cart**: Represents temporary shopping cart for a user containing CartItems (products with quantities) from a single store. Related to one User and one Store.

- **Order**: Represents a completed purchase transaction with order number, order date, status (Pending/Validation/Confirmed/Completed/Cancelled), total amount, billing address, payment reference, and QR code. Related to User, Store, and multiple OrderItems.

- **OrderItem**: Represents a product within an order with quantity and price at time of purchase. Links Order to Product.

- **Category**: Represents product classification (Electronics, Furniture, Sports, Fashion, etc.) with name, icon, and display order. Related to Products and User preferences.

- **Favorite**: Represents user's saved products or stores with saved date. Links User to Product or Store.

- **Notification**: Represents push notification with type (Order Update/Deal Alert/Promotional), title, message, target (order ID or product ID), sent timestamp, and read status. Related to User.

- **NotificationPreference**: Represents user's notification settings with toggles per category, promotional preference, and store subscriptions. Related to User.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete first-time onboarding (measured from app open through account creation, category selection, location setup, and notification configuration to reaching home feed) in under 3 minutes with less than 30% drop-off rate

- **SC-002**: Users can discover and view products from nearby stores within 2 seconds of opening the app (after initial location permission granted)

- **SC-003**: Text search returns relevant results within 1 second for 95% of queries with minimum 3 characters

- **SC-004**: Barcode scanning successfully recognizes barcodes within 2 seconds with 90% accuracy for products in the catalog

- **SC-005**: 80% of users can find a desired product using either search, categories, or home feed within 1 minute

- **SC-006**: Logged-in users can complete checkout (from cart through payment) in under 2 minutes when billing information is pre-saved

- **SC-007**: Payment processing completes within 5 seconds with 99% success rate for valid payment methods

- **SC-008**: Users receive order status push notifications within 30 seconds of status changes

- **SC-009**: The app maintains 60fps scrolling performance on product grids and lists for 95% of interactions

- **SC-010**: App launch time from cold start to interactive home screen is under 2 seconds on modern devices (iOS 14+, Android 8+)

- **SC-011**: 90% of users successfully complete their first product addition to cart on first attempt without errors

- **SC-012**: Users can view order history and access order details within 1 second of tapping Orders tab

- **SC-013**: Location-based product filtering updates within 1 second when user adjusts search radius or location

- **SC-014**: Image loading for product thumbnails completes within 1 second for 90% of images on 4G connection

- **SC-015**: The app supports 10,000 concurrent users browsing products without performance degradation

- **SC-016**: Users rate the onboarding experience as "easy" or "very easy" in 85% of post-onboarding surveys

- **SC-017**: 70% of users who complete onboarding enable push notifications

- **SC-018**: Users can locate and modify any preference (categories, location, notifications) in settings within 30 seconds

- **SC-019**: The cart-to-checkout conversion rate is above 60% (users who add to cart proceed to complete checkout)

- **SC-020**: Support ticket volume for "can't find products" or "location issues" is below 5% of active users per month
