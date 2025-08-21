# AppSchemasBookingV2BookingRead


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**customer_id** | **string** |  | [default to undefined]
**pickup_address** | **string** |  | [default to undefined]
**pickup_lat** | **number** |  | [default to undefined]
**pickup_lng** | **number** |  | [default to undefined]
**dropoff_address** | **string** |  | [default to undefined]
**dropoff_lat** | **number** |  | [default to undefined]
**dropoff_lng** | **number** |  | [default to undefined]
**pickup_when** | **string** |  | [default to undefined]
**notes** | **string** |  | [optional] [default to undefined]
**passengers** | **number** |  | [default to undefined]
**estimated_price_cents** | **number** |  | [default to undefined]
**final_price_cents** | **number** |  | [optional] [default to undefined]
**deposit_required_cents** | **number** |  | [default to undefined]
**deposit_payment_intent_id** | **string** |  | [optional] [default to undefined]
**final_payment_intent_id** | **string** |  | [optional] [default to undefined]
**id** | **string** |  | [default to undefined]
**public_code** | **string** |  | [default to undefined]
**status** | [**BookingStatus**](BookingStatus.md) |  | [default to undefined]
**created_at** | **string** |  | [default to undefined]
**updated_at** | **string** |  | [default to undefined]
**leave_at** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { AppSchemasBookingV2BookingRead } from './api';

const instance: AppSchemasBookingV2BookingRead = {
    customer_id,
    pickup_address,
    pickup_lat,
    pickup_lng,
    dropoff_address,
    dropoff_lat,
    dropoff_lng,
    pickup_when,
    notes,
    passengers,
    estimated_price_cents,
    final_price_cents,
    deposit_required_cents,
    deposit_payment_intent_id,
    final_payment_intent_id,
    id,
    public_code,
    status,
    created_at,
    updated_at,
    leave_at,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
