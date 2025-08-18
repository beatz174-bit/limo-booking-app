# GeocodeApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiReverseGeocodeGeocodeReverseGet**](#apireversegeocodegeocodereverseget) | **GET** /geocode/reverse | Api Reverse Geocode|

# **apiReverseGeocodeGeocodeReverseGet**
> GeocodeResponse apiReverseGeocodeGeocodeReverseGet()


### Example

```typescript
import {
    GeocodeApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new GeocodeApi(configuration);

let lat: number; // (default to undefined)
let lon: number; // (default to undefined)

const { status, data } = await apiInstance.apiReverseGeocodeGeocodeReverseGet(
    lat,
    lon
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **lat** | [**number**] |  | defaults to undefined|
| **lon** | [**number**] |  | defaults to undefined|


### Return type

**GeocodeResponse**

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

