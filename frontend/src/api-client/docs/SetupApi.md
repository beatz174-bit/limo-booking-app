# SetupApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**setupSetupPost**](#setupsetuppost) | **POST** /setup | Setup|
|[**setupStatusSetupGet**](#setupstatussetupget) | **GET** /setup | Setup Status|

# **setupSetupPost**
> any setupSetupPost(setupPayload)

Create admin settings and initial user.

### Example

```typescript
import {
    SetupApi,
    Configuration,
    SetupPayload
} from './api';

const configuration = new Configuration();
const apiInstance = new SetupApi(configuration);

let setupPayload: SetupPayload; //

const { status, data } = await apiInstance.setupSetupPost(
    setupPayload
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setupPayload** | **SetupPayload**|  | |


### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |
|**422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **setupStatusSetupGet**
> SettingsPayload setupStatusSetupGet()

Check if setup has already been completed.

### Example

```typescript
import {
    SetupApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SetupApi(configuration);

const { status, data } = await apiInstance.setupStatusSetupGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SettingsPayload**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

