import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class SimulateWebhookDto {
  @ApiProperty({ description: 'Stripe / Provider Payment ID (e.g. pi_xxx)' })
  @IsString()
  @IsNotEmpty()
  providerPaymentId!: string;

  @ApiProperty({
    description: 'Webhook event type to simulate',
    enum: [
      'payment_intent.amount_capturable_updated',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
    ],
  })
  @IsString()
  @IsIn([
    'payment_intent.amount_capturable_updated',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
  ])
  eventType!: string;
}

