# BookingCreate

Payload to create a new booking.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**pickup_location** | **string** |  | [default to undefined]
**destination** | **string** |  | [default to undefined]
**ride_time** | **string** |  | [default to undefined]
**price** | [**Price**](Price.md) |  | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to StatusEnum_Pending]

## Example

```typescript
import { BookingCreate } from './api';

const instance: BookingCreate = {
    pickup_location,
    destination,
    ride_time,
    price,
    status,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
