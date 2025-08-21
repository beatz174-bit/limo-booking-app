# SettingsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiGetSettingsSettingsGet**](#apigetsettingssettingsget) | **GET** /settings | Api Get Settings|
|[**apiUpdateSettingsSettingsPut**](#apiupdatesettingssettingsput) | **PUT** /settings | Api Update Settings|

# **apiGetSettingsSettingsGet**
> SettingsPayload apiGetSettingsSettingsGet()

Return current pricing and configuration.

### Example

```typescript
import {
    SettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SettingsApi(configuration);

const { status, data } = await apiInstance.apiGetSettingsSettingsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SettingsPayload**

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

# **apiUpdateSettingsSettingsPut**
> SettingsPayload apiUpdateSettingsSettingsPut(settingsPayload)

Persist updated configuration values.

### Example

```typescript
import {
    SettingsApi,
    Configuration,
    SettingsPayload
} from './api';

const configuration = new Configuration();
const apiInstance = new SettingsApi(configuration);

let settingsPayload: SettingsPayload; //

const { status, data } = await apiInstance.apiUpdateSettingsSettingsPut(
    settingsPayload
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **settingsPayload** | **SettingsPayload**|  | |


### Return type

**SettingsPayload**

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

