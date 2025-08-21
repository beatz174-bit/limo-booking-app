# CustomerBookingsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**listMyBookingsApiV1CustomersMeBookingsGet**](#listmybookingsapiv1customersmebookingsget) | **GET** /api/v1/customers/me/bookings | List My Bookings|

# **listMyBookingsApiV1CustomersMeBookingsGet**
> Array<AppSchemasBookingV2BookingRead> listMyBookingsApiV1CustomersMeBookingsGet()


### Example

```typescript
import {
    CustomerBookingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CustomerBookingsApi(configuration);

const { status, data } = await apiInstance.listMyBookingsApiV1CustomersMeBookingsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<AppSchemasBookingV2BookingRead>**

### Authorization

[OAuth2PasswordBearer](../README.md#OAuth2PasswordBearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

