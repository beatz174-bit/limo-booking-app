# BookingsApi

All URIs are relative to *http://limo-booking-app-backend:8000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiCreateBookingBookingsPost**](#apicreatebookingbookingspost) | **POST** /bookings | Api Create Booking|
|[**apiDeleteBookingBookingsBookingIdDelete**](#apideletebookingbookingsbookingiddelete) | **DELETE** /bookings/{booking_id} | Api Delete Booking|
|[**apiListBookingsBookingsGet**](#apilistbookingsbookingsget) | **GET** /bookings | Api List Bookings|
|[**apiUpdateStatusBookingsBookingIdStatusPatch**](#apiupdatestatusbookingsbookingidstatuspatch) | **PATCH** /bookings/{booking_id}/status | Api Update Status|

# **apiCreateBookingBookingsPost**
> BookingRead apiCreateBookingBookingsPost(bookingCreate)


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

**BookingRead**

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
> Array<BookingRead> apiListBookingsBookingsGet()


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

**Array<BookingRead>**

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
> BookingRead apiUpdateStatusBookingsBookingIdStatusPatch(bookingUpdate)


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

**BookingRead**

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

