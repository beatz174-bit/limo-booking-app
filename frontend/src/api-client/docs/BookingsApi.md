# BookingsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createBookingEndpointApiV1BookingsPost**](#createbookingendpointapiv1bookingspost) | **POST** /api/v1/bookings | Create Booking Endpoint|

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

