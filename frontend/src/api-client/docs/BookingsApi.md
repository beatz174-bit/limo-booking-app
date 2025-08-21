# BookingsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiCreateBookingBookingsPost**](#apicreatebookingbookingspost) | **POST** /bookings | Api Create Booking|
|[**apiDeleteBookingBookingsBookingIdDelete**](#apideletebookingbookingsbookingiddelete) | **DELETE** /bookings/{booking_id} | Api Delete Booking|
|[**apiListBookingsBookingsGet**](#apilistbookingsbookingsget) | **GET** /bookings | Api List Bookings|
|[**apiUpdateStatusBookingsBookingIdStatusPatch**](#apiupdatestatusbookingsbookingidstatuspatch) | **PATCH** /bookings/{booking_id}/status | Api Update Status|
|[**createBookingEndpointApiV1BookingsPost**](#createbookingendpointapiv1bookingspost) | **POST** /api/v1/bookings | Create Booking Endpoint|

# **apiCreateBookingBookingsPost**
> AppSchemasBookingBookingRead apiCreateBookingBookingsPost(bookingCreate)

Create a new booking for the current user.

### Example

```typescript
import {
    BookingsApi,
    Configuration,
    BookingCreate
} from './api';

const configuration = new Configuration();
const apiInstance = new BookingsApi(configuration);

let bookingCreate: BookingCreate; //

const { status, data } = await apiInstance.apiCreateBookingBookingsPost(
    bookingCreate
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingCreate** | **BookingCreate**|  | |


### Return type

**AppSchemasBookingBookingRead**

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiDeleteBookingBookingsBookingIdDelete**
> apiDeleteBookingBookingsBookingIdDelete()

Remove a booking from the system.

### Example

```typescript
import {
    BookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new BookingsApi(configuration);

let bookingId: number; // (default to undefined)

const { status, data } = await apiInstance.apiDeleteBookingBookingsBookingIdDelete(
    bookingId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingId** | [**number**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiListBookingsBookingsGet**
> Array<AppSchemasBookingBookingRead> apiListBookingsBookingsGet()

List bookings for the authenticated user.

### Example

```typescript
import {
    BookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new BookingsApi(configuration);

let skip: number; // (optional) (default to 0)
let limit: number; // (optional) (default to 100)

const { status, data } = await apiInstance.apiListBookingsBookingsGet(
    skip,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **skip** | [**number**] |  | (optional) defaults to 0|
| **limit** | [**number**] |  | (optional) defaults to 100|


### Return type

**Array<AppSchemasBookingBookingRead>**

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiUpdateStatusBookingsBookingIdStatusPatch**
> AppSchemasBookingBookingRead apiUpdateStatusBookingsBookingIdStatusPatch(bookingUpdate)

Update the status of an existing booking.

### Example

```typescript
import {
    BookingsApi,
    Configuration,
    BookingUpdate
} from './api';

const configuration = new Configuration();
const apiInstance = new BookingsApi(configuration);

let bookingId: number; // (default to undefined)
let bookingUpdate: BookingUpdate; //

const { status, data } = await apiInstance.apiUpdateStatusBookingsBookingIdStatusPatch(
    bookingId,
    bookingUpdate
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingUpdate** | **BookingUpdate**|  | |
| **bookingId** | [**number**] |  | defaults to undefined|


### Return type

**AppSchemasBookingBookingRead**

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createBookingEndpointApiV1BookingsPost**
> BookingCreateResponse createBookingEndpointApiV1BookingsPost(bookingCreateRequest)


### Example

```typescript
import {
    BookingsApi,
    Configuration,
    BookingCreateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new BookingsApi(configuration);

let bookingCreateRequest: BookingCreateRequest; //

const { status, data } = await apiInstance.createBookingEndpointApiV1BookingsPost(
    bookingCreateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingCreateRequest** | **BookingCreateRequest**|  | |


### Return type

**BookingCreateResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

