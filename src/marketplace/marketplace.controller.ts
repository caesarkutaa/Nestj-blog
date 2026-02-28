import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Request,
  Delete,
  Put,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ApplyServiceDto } from './dto/apply-service.dto';
import { AuthGuard } from '@nestjs/passport';
import { PaymentType } from './schema/service-payment.schema';
import { ApplicationStatus } from './schema/service-application.schema';
import { JwtAuthGuard } from 'src/shared/jwt-auth.guard';
import { Inject, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  private getUserId(req: any): string {
    const id = req.user?.id || req.user?._id || req.user?.userId || req.user?.sub;
    return id;
  }

  // ==================== SERVICES ====================

  @Post('services')
  @UseGuards(AuthGuard('jwt'))
  async createService(@Request() req: any, @Body() dto: CreateServiceDto) {
    const clientId = this.getUserId(req);
    const clientType = req.user.type === 'company' ? 'Company' : 'User';
    return await this.marketplaceService.createService(clientId, { ...dto, clientType });
  }

  @Get('services')
  async getAllServices(
    @Query('category') category?: string,
    @Query('minBudget') minBudget?: number,
    @Query('maxBudget') maxBudget?: number,
  ) {
    return await this.marketplaceService.getAllServices({
      category,
      minBudget,
      maxBudget,
    });
  }

  @Get('services/:id')
  async getService(@Param('id') id: string) {
    return await this.marketplaceService.getServiceById(id);
  }

  @Get('my-services')
  @UseGuards(AuthGuard('jwt'))
  async getMyServices(@Request() req: any) {
    const clientId = this.getUserId(req);
    return await this.marketplaceService.getMyPostedServices(clientId);
  }

 
@Get('user/:userId/services')
async getUserServices(@Param('userId') userId: string) {
  return await this.marketplaceService.getUserServices(userId);
}

  @Put('services/:serviceId')
  @UseGuards(AuthGuard('jwt'))
  async updateService(
    @Request() req: any,
    @Param('serviceId') serviceId: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    const clientId = this.getUserId(req);
    return await this.marketplaceService.updateService(serviceId, clientId, updateServiceDto);
  }

  @Delete('services/:serviceId')
  @UseGuards(AuthGuard('jwt'))
  async deleteService(@Request() req: any, @Param('serviceId') serviceId: string) {
    const clientId = this.getUserId(req);
    return await this.marketplaceService.deleteService(serviceId, clientId);
  }

  // ==================== APPLICATIONS ====================

  @Post('services/:serviceId/apply')
  @UseGuards(AuthGuard('jwt'))
  async applyToService(
    @Request() req: any,
    @Param('serviceId') serviceId: string,
    @Body() dto: ApplyServiceDto,
  ) {
    const developerId = this.getUserId(req);
    return await this.marketplaceService.applyToService(developerId, serviceId, dto);
  }

  @Get('services/:serviceId/applications')
  @UseGuards(AuthGuard('jwt'))
  async getServiceApplications(@Request() req: any, @Param('serviceId') serviceId: string) {
    const clientId = this.getUserId(req);
    return await this.marketplaceService.getServiceApplications(serviceId, clientId);
  }

  @Get('my-applications')
  @UseGuards(AuthGuard('jwt'))
  async getMyApplications(@Request() req: any) {
    const developerId = this.getUserId(req);
    return await this.marketplaceService.getMyApplications(developerId);
  }

  @Patch('applications/:applicationId/status')
  @UseGuards(AuthGuard('jwt'))
  async updateApplicationStatus(
    @Request() req: any,
    @Param('applicationId') applicationId: string,
    @Body('status') status: ApplicationStatus,
  ) {
    const clientId = this.getUserId(req);
    return await this.marketplaceService.updateApplicationStatus(applicationId, clientId, status);
  }

  // ==================== CUSTOM ORDERS ====================

  // ✅ Developer creates custom order and sends to chat
  @Post('services/:serviceId/custom-order')
  @UseGuards(JwtAuthGuard)
  async createCustomOrder(
    @Param('serviceId') serviceId: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const developerId = this.getUserId(req);
    
    // Developer creates order, gets sent to chat
    const result = await this.marketplaceService.createCustomOrder(
      developerId,
      serviceId,
      dto.clientId || developerId, // Will be fixed in service layer
      dto,
    );

    // Emit to chat via socket
    this.chatGateway.server
      .to(`service_${serviceId}`)
      .emit('newMessage', result.message);

    return result;
  }

  @Post('services/:serviceId/orders')
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Param('serviceId') serviceId: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const buyerId = this.getUserId(req);

    return await this.marketplaceService.createCustomOrder(
      buyerId,
      serviceId,
      buyerId,
      dto,
    );
  }
  
  @Get('services/:serviceId/orders')
  @UseGuards(AuthGuard('jwt'))
  async getServiceOrders(@Request() req: any, @Param('serviceId') serviceId: string) {
    const userId = this.getUserId(req);
    return await this.marketplaceService.getServiceOrders(serviceId, userId);
  }

  // ==================== ORDER PAYMENT ====================

  @Get('orders/:orderId')
  async getOrder(@Param('orderId') orderId: string) {
    return this.marketplaceService.getOrderById(orderId);
  }

@Get('my-orders')
@UseGuards(JwtAuthGuard)
async getMyOrders(@Req() req: any) {
  const userId = this.getUserId(req);
  return await this.marketplaceService.getMyOrders(userId);
}

@Post('orders/:orderId/create-paypal-order')
@UseGuards(JwtAuthGuard)
async createPaypalOrder(
  @Param('orderId') orderId: string,
  @Request() req: any,
) {
  const userId = this.getUserId(req);
  return this.marketplaceService.createPayPalOrderForCustomOrder(
    orderId,
    userId,
  );
}


@Post('orders/:orderId/capture-paypal-order')
@UseGuards(JwtAuthGuard)
async capturePaypalOrder(
  @Param('orderId') orderId: string,
  @Body('paypalOrderId') paypalOrderId: string,
  @Request() req: any,
) {
  console.log('DEBUG req.user:', req.user); 
  console.log('DEBUG paypalOrderId:', paypalOrderId);

  const userId = req.user?._id || req.user?.id || req.user?.sub;

  if (!userId) {
    throw new BadRequestException('User not authenticated');
  }

  return this.marketplaceService.capturePayPalOrderForCustomOrder(
    orderId,
    paypalOrderId,
    userId,
  );
}

// ==================== PAYMENT ACTIONS ====================

@Post('messages/:messageId/payment-action')
@UseGuards(JwtAuthGuard)
async handlePaymentAction(
  @Param('messageId') messageId: string,
  @Body() body: { action: 'accept' | 'decline' },
  @Req() req: any,
) {
  const clientId = this.getUserId(req);
      
  // Ensure the service call is awaited and the result is captured
  const message: any = await this.marketplaceService.updatePaymentStatus(
    messageId,
    body.action === 'accept' ? 'accepted' : 'declined',
    clientId
  );

  // Check if message exists before accessing properties
  if (!message) {
    throw new NotFoundException('Message not found');
  }

  // Safety Check: Now 'message' is not void
  if (!message.paymentDetails) {
    throw new BadRequestException('Message does not contain payment details');
  }

  this.chatGateway.server
    .to(`service_${message.serviceId}`)
    .emit('paymentStatusUpdate', {
      messageId: message._id,
      status: message.paymentDetails.status,
      orderId: message.paymentDetails.orderId,
    });

  return message;
}



@Post('orders/:orderId/request-payout')
@UseGuards(JwtAuthGuard)
async requestPayout(
  @Param('orderId') orderId: string,
  @Req() req: any,
) {
  const developerId = this.getUserId(req);
  return await this.marketplaceService.requestPayout(orderId, developerId);
}

// ✅ Developer: Get My Payout Requests
@Get('my-payout-requests')
@UseGuards(JwtAuthGuard)
async getMyPayoutRequests(@Req() req: any) {
  const developerId = this.getUserId(req);
  return await this.marketplaceService.getMyPayoutRequests(developerId);
}

  // ==================== ORDER WORKFLOW ====================

  @Post('orders/:orderId/start-work')
  @UseGuards(JwtAuthGuard)
  async startWork(@Param('orderId') orderId: string, @Req() req: any) {
    const developerId = this.getUserId(req);
    return await this.marketplaceService.startWork(orderId, developerId);
  }

  @Post('orders/:orderId/submit-delivery')
  @UseGuards(AuthGuard('jwt'))
  async submitDelivery(
    @Request() req: any,
    @Param('orderId') orderId: string,
    @Body() dto: { deliveryNote: string; deliveryFiles?: string[] },
  ) {
    const developerId = this.getUserId(req);
    const result = await this.marketplaceService.submitDelivery(orderId, developerId, dto);

    this.chatGateway.server
      .to(`service_${result.order.serviceId}`)
      .emit('newMessage', result.message);

    return result;
  }

  @Post('orders/:orderId/accept-delivery')
  @UseGuards(JwtAuthGuard)
  async acceptDelivery(
    @Param('orderId') orderId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const buyerId = this.getUserId(req);
    return await this.marketplaceService.acceptDelivery(orderId, buyerId, body);
  }

  // ==================== CHAT MESSAGES ====================

  @Get('services/:serviceId/messages')
  @UseGuards(AuthGuard('jwt'))
  async getServiceMessages(@Request() req: any, @Param('serviceId') serviceId: string) {
    const userId = this.getUserId(req);
    return await this.marketplaceService.getServiceMessages(serviceId, userId);
  }

  @Post('services/:serviceId/messages')
  @UseGuards(AuthGuard('jwt'))
  async sendMessage(
    @Request() req: any,
    @Param('serviceId') serviceId: string,
    @Body() body: { text: string },
  ) {
    const senderId = this.getUserId(req);
    const message = await this.marketplaceService.sendMessage(serviceId, body.text, senderId);

    // Emit socket event
    this.chatGateway.server.to(`service_${serviceId}`).emit('newMessage', message);

    return message;
  }

  // ==================== STATS ====================

  @Get('stats/client')
  @UseGuards(AuthGuard('jwt'))
  async getClientStats(@Request() req: any) {
    const clientId = this.getUserId(req);
    return await this.marketplaceService.getClientStats(clientId);
  }

  @Get('stats/developer')
  @UseGuards(AuthGuard('jwt'))
  async getDeveloperStats(@Request() req: any) {
    const developerId = this.getUserId(req);
    return await this.marketplaceService.getDeveloperStats(developerId);
  }
}