# AvailabilityApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createSlotApiV1AvailabilityPost**](#createslotapiv1availabilitypost) | **POST** /api/v1/availability | Create Slot|
|[**getAvailabilityApiV1AvailabilityGet**](#getavailabilityapiv1availabilityget) | **GET** /api/v1/availability | Get Availability|

# **createSlotApiV1AvailabilityPost**
> AvailabilitySlotRead createSlotApiV1AvailabilityPost(availabilitySlotCreate)

Create a manual availability block.

### Example

```typescript
import {
    AvailabilityApi,
    Configuration,
    AvailabilitySlotCreate
} from './api';

const configuration = new Configuration();
const apiInstance = new AvailabilityApi(configuration);

let availabilitySlotCreate: AvailabilitySlotCreate; //

const { status, data } = await apiInstance.createSlotApiV1AvailabilityPost(
    availabilitySlotCreate
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **availabilitySlotCreate** | **AvailabilitySlotCreate**|  | |


### Return type

**AvailabilitySlotRead**

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

# **getAvailabilityApiV1AvailabilityGet**
> AvailabilityResponse getAvailabilityApiV1AvailabilityGet()

Return availability slots and confirmed bookings for a given month.

### Example

```typescript
import {
    AvailabilityApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AvailabilityApi(configuration);

let month: string; // (default to undefined)

const { status, data } = await apiInstance.getAvailabilityApiV1AvailabilityGet(
    month
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **month** | [**string**] |  | defaults to undefined|


### Return type

**AvailabilityResponse**

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

