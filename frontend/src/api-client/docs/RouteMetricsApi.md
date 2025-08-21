# RouteMetricsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiRouteMetricsRouteMetricsGet**](#apiroutemetricsroutemetricsget) | **GET** /route-metrics | Compute distance and duration between two addresses|

# **apiRouteMetricsRouteMetricsGet**
> any apiRouteMetricsRouteMetricsGet()

Return travel metrics between pickup and dropoff addresses.

### Example

```typescript
import {
    RouteMetricsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new RouteMetricsApi(configuration);

let pickup: string; // (default to undefined)
let dropoff: string; // (default to undefined)
let rideTime: string; //Desired pickup time to account for traffic (optional) (default to undefined)

const { status, data } = await apiInstance.apiRouteMetricsRouteMetricsGet(
    pickup,
    dropoff,
    rideTime
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **pickup** | [**string**] |  | defaults to undefined|
| **dropoff** | [**string**] |  | defaults to undefined|
| **rideTime** | [**string**] | Desired pickup time to account for traffic | (optional) defaults to undefined|


### Return type

**any**

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

