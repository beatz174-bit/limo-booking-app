# DriverBookingsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**arriveDropoffApiV1DriverBookingsBookingIdArriveDropoffPost**](#arrivedropoffapiv1driverbookingsbookingidarrivedropoffpost) | **POST** /api/v1/driver/bookings/{booking_id}/arrive-dropoff | Arrive Dropoff|
|[**arrivePickupApiV1DriverBookingsBookingIdArrivePickupPost**](#arrivepickupapiv1driverbookingsbookingidarrivepickuppost) | **POST** /api/v1/driver/bookings/{booking_id}/arrive-pickup | Arrive Pickup|
|[**completeBookingApiV1DriverBookingsBookingIdCompletePost**](#completebookingapiv1driverbookingsbookingidcompletepost) | **POST** /api/v1/driver/bookings/{booking_id}/complete | Complete Booking|
|[**confirmBookingApiV1DriverBookingsBookingIdConfirmPost**](#confirmbookingapiv1driverbookingsbookingidconfirmpost) | **POST** /api/v1/driver/bookings/{booking_id}/confirm | Confirm Booking|
|[**declineBookingApiV1DriverBookingsBookingIdDeclinePost**](#declinebookingapiv1driverbookingsbookingiddeclinepost) | **POST** /api/v1/driver/bookings/{booking_id}/decline | Decline Booking|
|[**leaveBookingApiV1DriverBookingsBookingIdLeavePost**](#leavebookingapiv1driverbookingsbookingidleavepost) | **POST** /api/v1/driver/bookings/{booking_id}/leave | Leave Booking|
|[**listBookingsApiV1DriverBookingsGet**](#listbookingsapiv1driverbookingsget) | **GET** /api/v1/driver/bookings | List Bookings|
|[**startTripApiV1DriverBookingsBookingIdStartTripPost**](#starttripapiv1driverbookingsbookingidstarttrippost) | **POST** /api/v1/driver/bookings/{booking_id}/start-trip | Start Trip|

# **arriveDropoffApiV1DriverBookingsBookingIdArriveDropoffPost**
> BookingStatusResponse arriveDropoffApiV1DriverBookingsBookingIdArriveDropoffPost()


### Example

```typescript
import {
    DriverBookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DriverBookingsApi(configuration);

let bookingId: string; // (default to undefined)

const { status, data } = await apiInstance.arriveDropoffApiV1DriverBookingsBookingIdArriveDropoffPost(
    bookingId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingId** | [**string**] |  | defaults to undefined|


### Return type

**BookingStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **arrivePickupApiV1DriverBookingsBookingIdArrivePickupPost**
> BookingStatusResponse arrivePickupApiV1DriverBookingsBookingIdArrivePickupPost()


### Example

```typescript
import {
    DriverBookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DriverBookingsApi(configuration);

let bookingId: string; // (default to undefined)

const { status, data } = await apiInstance.arrivePickupApiV1DriverBookingsBookingIdArrivePickupPost(
    bookingId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingId** | [**string**] |  | defaults to undefined|


### Return type

**BookingStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **completeBookingApiV1DriverBookingsBookingIdCompletePost**
> BookingStatusResponse completeBookingApiV1DriverBookingsBookingIdCompletePost()


### Example

```typescript
import {
    DriverBookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DriverBookingsApi(configuration);

let bookingId: string; // (default to undefined)

const { status, data } = await apiInstance.completeBookingApiV1DriverBookingsBookingIdCompletePost(
    bookingId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingId** | [**string**] |  | defaults to undefined|


### Return type

**BookingStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **confirmBookingApiV1DriverBookingsBookingIdConfirmPost**
> BookingStatusResponse confirmBookingApiV1DriverBookingsBookingIdConfirmPost()


### Example

```typescript
import {
    DriverBookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DriverBookingsApi(configuration);

let bookingId: string; // (default to undefined)

const { status, data } = await apiInstance.confirmBookingApiV1DriverBookingsBookingIdConfirmPost(
    bookingId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingId** | [**string**] |  | defaults to undefined|


### Return type

**BookingStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **declineBookingApiV1DriverBookingsBookingIdDeclinePost**
> BookingStatusResponse declineBookingApiV1DriverBookingsBookingIdDeclinePost()


### Example

```typescript
import {
    DriverBookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DriverBookingsApi(configuration);

let bookingId: string; // (default to undefined)

const { status, data } = await apiInstance.declineBookingApiV1DriverBookingsBookingIdDeclinePost(
    bookingId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingId** | [**string**] |  | defaults to undefined|


### Return type

**BookingStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **leaveBookingApiV1DriverBookingsBookingIdLeavePost**
> BookingStatusResponse leaveBookingApiV1DriverBookingsBookingIdLeavePost()


### Example

```typescript
import {
    DriverBookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DriverBookingsApi(configuration);

let bookingId: string; // (default to undefined)

const { status, data } = await apiInstance.leaveBookingApiV1DriverBookingsBookingIdLeavePost(
    bookingId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingId** | [**string**] |  | defaults to undefined|


### Return type

**BookingStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listBookingsApiV1DriverBookingsGet**
> Array<AppSchemasBookingV2BookingRead> listBookingsApiV1DriverBookingsGet()


### Example

```typescript
import {
    DriverBookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DriverBookingsApi(configuration);

let status: BookingStatus; // (optional) (default to undefined)

const { status, data } = await apiInstance.listBookingsApiV1DriverBookingsGet(
    status
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **status** | **BookingStatus** |  | (optional) defaults to undefined|


### Return type

**Array<AppSchemasBookingV2BookingRead>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **startTripApiV1DriverBookingsBookingIdStartTripPost**
> BookingStatusResponse startTripApiV1DriverBookingsBookingIdStartTripPost()


### Example

```typescript
import {
    DriverBookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DriverBookingsApi(configuration);

let bookingId: string; // (default to undefined)

const { status, data } = await apiInstance.startTripApiV1DriverBookingsBookingIdStartTripPost(
    bookingId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bookingId** | [**string**] |  | defaults to undefined|


### Return type

**BookingStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

