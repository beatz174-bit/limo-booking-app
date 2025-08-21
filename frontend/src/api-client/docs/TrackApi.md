# TrackApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**trackBookingApiV1TrackCodeGet**](#trackbookingapiv1trackcodeget) | **GET** /api/v1/track/{code} | Track Booking|

# **trackBookingApiV1TrackCodeGet**
> TrackResponse trackBookingApiV1TrackCodeGet()


### Example

```typescript
import {
    TrackApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new TrackApi(configuration);

let code: string; // (default to undefined)

const { status, data } = await apiInstance.trackBookingApiV1TrackCodeGet(
    code
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **code** | [**string**] |  | defaults to undefined|


### Return type

**TrackResponse**

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

