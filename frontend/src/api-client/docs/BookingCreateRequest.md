# BookingCreateRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**customer** | [**CustomerInfo**](CustomerInfo.md) |  | [default to undefined]
**pickup_when** | **string** |  | [default to undefined]
**pickup** | [**Location**](Location.md) |  | [default to undefined]
**dropoff** | [**Location**](Location.md) |  | [default to undefined]
**passengers** | **number** |  | [default to undefined]
**notes** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { BookingCreateRequest } from './api';

const instance: BookingCreateRequest = {
    customer,
    pickup_when,
    pickup,
    dropoff,
    passengers,
    notes,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
