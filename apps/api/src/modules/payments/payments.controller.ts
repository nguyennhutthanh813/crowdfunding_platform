import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiHeader } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto, SimulateWebhookDto } from './dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent / authorization for pledge' })
  async createPaymentIntent(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(userId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Stripe / Provider Webhook events' })
  @ApiHeader({ name: 'stripe-signature', required: false, description: 'Stripe webhook signature header' })
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
    @Body() body?: any,
  ) {
    // Ưu tiên req.rawBody khi được bật rawBody: true trong NestJS, fallback về body
    const rawPayload = req.rawBody || body;
    return this.paymentsService.handleWebhook(rawPayload, signature, body);
  }

  @Post('simulate-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate a payment webhook event for testing (amount_capturable, succeeded, etc.)' })
  async simulateWebhook(@Body() dto: SimulateWebhookDto) {
    return this.paymentsService.simulateWebhook(dto);
  }

  @Post('capture/:pledgeId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture authorized funds for pledge (Creator or Admin)' })
  @ApiParam({ name: 'pledgeId', description: 'Pledge UUID' })
  async capturePayment(
    @Param('pledgeId') pledgeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.capturePayment(pledgeId, userId);
  }

  @Post('cancel/:pledgeId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel payment authorization for pledge' })
  @ApiParam({ name: 'pledgeId', description: 'Pledge UUID' })
  async cancelPayment(
    @Param('pledgeId') pledgeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.cancelPayment(pledgeId, userId);
  }

  @Get('authorizations/:pledgeId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment authorizations and webhook history for pledge' })
  @ApiParam({ name: 'pledgeId', description: 'Pledge UUID' })
  async getAuthorization(
    @Param('pledgeId') pledgeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.getAuthorization(pledgeId, userId);
  }
}

