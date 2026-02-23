import { Injectable } from '@nestjs/common';
import * as paypal from '@paypal/checkout-server-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayPalService {
  private client: paypal.core.PayPalHttpClient;
  private readonly PLATFORM_FEE_PERCENT = 0.05; // 5%

  constructor(private configService: ConfigService) {
    const environment = new paypal.core.SandboxEnvironment(
      this.configService.get('PAYPAL_CLIENT_ID'),
      this.configService.get('PAYPAL_SECRET'),
    );
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  calculateFees(amount: number) {
    const platformFee = amount * this.PLATFORM_FEE_PERCENT;
    const developerAmount = amount - platformFee;
    
    return {
      totalAmount: amount,
      platformFee: platformFee,
      developerAmount: developerAmount,
    };
  }

  async createOrder(amount: number, description: string) {
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
          description: description,
        },
      ],
    });

    const response = await this.client.execute(request);
    return response.result;
  }

  async captureOrder(orderId: string) {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    const response = await this.client.execute(request);
    return response.result;
  }

  async createPayout(developerEmail: string, amount: number, note: string) {
    // This would use PayPal Payouts API
    // Implementation depends on your PayPal account setup
    return {
      payoutId: 'PAYOUT_' + Date.now(),
      amount,
      recipient: developerEmail,
    };
  }
}