import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceTask, ServiceStatus } from './schema/service.schema';
import { ServiceApplication, ApplicationStatus } from './schema/service-application.schema';
import { CustomOrder, OrderStatus } from './schema/custom-order.schema';
import { OrderMessage, MessageType } from './schema/order-message.schema';
import axios from 'axios';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectModel('ServiceTask')
    private serviceModel: Model<ServiceTask>,
    @InjectModel('ServiceMessage')
    private messageModel: Model<any>,
    @InjectModel(ServiceApplication.name)
    private applicationModel: Model<ServiceApplication>,
    @InjectModel(CustomOrder.name)
    private orderModel: Model<CustomOrder>,
      @InjectModel('Company')
    private companyModel: Model<any>,
     @InjectModel('User')  
    private userModel: Model<any>,
    @InjectModel(OrderMessage.name)
    private orderMessageModel: Model<OrderMessage>,
  ) {}

  // ==================== EXISTING SERVICE CRUD (Keep as is) ====================

  async createService(clientId: string, dto: any) {
    const service = new this.serviceModel({
      ...dto,
      clientId: new Types.ObjectId(clientId),
    });
    return await service.save();
  }

  async getAllServices(filters?: any) {
    const query: any = {};
    if (filters?.category) query.category = filters.category;
    if (filters?.status) query.status = filters.status;
    else query.status = ServiceStatus.OPEN;

    if (filters?.minBudget || filters?.maxBudget) {
      query.budget = {};
      if (filters.minBudget) query.budget.$gte = filters.minBudget;
      if (filters.maxBudget) query.budget.$lte = filters.maxBudget;
    }

    return await this.serviceModel
      .find(query)
      .populate('clientId', 'firstName lastName email company paypalEmail companyName')
      .populate('assignedDeveloper', 'firstName lastName email paypalEmail paypalVerified companyName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getServiceById(id: string) {
    const service = await this.serviceModel
      .findById(id)
      .populate('clientId', 'firstName lastName email company paypalEmail companyName')
      .populate('assignedDeveloper', 'firstName lastName email paypalEmail paypalVerified companyName')
      .exec();

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

async getMyOrders(userId: string) {
  // Get all orders where the user is the CLIENT (buyer)
  const orders = await this.orderModel
    .find({
      clientId: new Types.ObjectId(userId),
      status: { $in: ['paid', 'in_progress', 'delivered', 'completed'] }, // Only paid orders
    })
    .populate('developerId', 'firstName lastName email paypalEmail companyName')
    .populate('serviceId', 'title description category budget deliveryTime')
    .sort({ paidAt: -1, createdAt: -1 })
    .exec();

  return orders;
}
  

  async getMyPostedServices(clientId: string) {
    return await this.serviceModel
      .find({
        $or: [
          { clientId: clientId },
          { clientId: new Types.ObjectId(clientId) },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateService(serviceId: string, clientId: string, updateData: any) {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');
    if (service.clientId.toString() !== clientId) {
      throw new ForbiddenException('You can only update your own services');
    }

    return await this.serviceModel.findByIdAndUpdate(
      serviceId,
      { $set: updateData },
      { new: true, runValidators: true },
    );
  }

  async deleteService(serviceId: string, clientId: string) {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');
    if (service.clientId.toString() !== clientId) {
      throw new ForbiddenException('You can only delete your own services');
    }

    await this.applicationModel.deleteMany({ serviceId: new Types.ObjectId(serviceId) });
    await this.orderModel.deleteMany({ serviceId: new Types.ObjectId(serviceId) });
    await this.serviceModel.findByIdAndDelete(serviceId);

    return { message: 'Service deleted successfully' };
  }

  // ==================== APPLICATIONS (Keep as is) ====================

  async applyToService(developerId: string, serviceId: string, dto: any) {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');
    if (service.status !== ServiceStatus.OPEN) {
      throw new BadRequestException('This service is no longer accepting applications');
    }

    const existing = await this.applicationModel.findOne({
      serviceId: new Types.ObjectId(serviceId),
      developerId: new Types.ObjectId(developerId),
    });

    if (existing) {
      throw new BadRequestException('You have already applied to this service');
    }

    const application = new this.applicationModel({
      serviceId: new Types.ObjectId(serviceId),
      developerId: new Types.ObjectId(developerId),
      clientId: service.clientId,
      ...dto,
    });

    const saved = await application.save();

    await this.serviceModel.findByIdAndUpdate(serviceId, {
      $inc: { applicationsCount: 1 },
    });

    return saved;
  }

  async getServiceApplications(serviceId: string, clientId: string) {
    const service = await this.serviceModel.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');
    if (service.clientId.toString() !== clientId) {
      throw new ForbiddenException('You can only view applications for your own services');
    }

    return await this.applicationModel
      .find({ serviceId: new Types.ObjectId(serviceId) })
      .populate('developerId', 'firstName lastName email profilePicture bio skills paypalEmail paypalVerified companyName')
      .sort({ appliedAt: -1 })
      .exec();
  }

  async getMyApplications(developerId: string) {
    return await this.applicationModel
      .find({ developerId: new Types.ObjectId(developerId) })
      .populate({
        path: 'serviceId',
        model: 'ServiceTask',
        populate: { path: 'clientId', select: 'firstName lastName companyName email paypalEmail paypalVerified' },
      })
      .sort({ appliedAt: -1 })
      .exec();
  }

  async updateApplicationStatus(
    applicationId: string,
    clientId: string,
    status: ApplicationStatus,
  ) {
    const application = await this.applicationModel.findById(applicationId);
    if (!application) throw new NotFoundException('Application not found');
    if (application.clientId.toString() !== clientId) {
      throw new ForbiddenException('You can only update applications for your own services');
    }

    application.status = status;

    if (status === ApplicationStatus.ACCEPTED) {
      await this.serviceModel.findByIdAndUpdate(application.serviceId, {
        assignedDeveloper: application.developerId,
        status: ServiceStatus.IN_PROGRESS,
      });

      await this.applicationModel.updateMany(
        {
          serviceId: application.serviceId,
          _id: { $ne: applicationId },
          status: { $in: [ApplicationStatus.PENDING, ApplicationStatus.REVIEWING] },
        },
        { status: ApplicationStatus.REJECTED },
      );
    }

    return await application.save();
  }

  // ==================== CUSTOM ORDERS (NEW) ====================

async createCustomOrder(
  developerId: string,
  serviceId: string,
  clientId: string,
  data: {
    title: string;
    description: string;
    price: number;
    deliveryTime: number;
    paymentType?: 'half_upfront' | 'full_upfront' | 'on_completion';
    revisions?: number;
    clientModel?: 'User' | 'Company';
  },
) {
  const service = await this.serviceModel.findById(serviceId);  
  if (!service) throw new NotFoundException('Service not found');

  const platformFee = data.price * 0.05;
  const totalAmount = data.price + platformFee;

  const paymentType = data.paymentType || 'full_upfront';
  const actualAmount = paymentType === 'half_upfront' 
    ? data.price / 2 
    : data.price;

  // ✅ FIX: Determine clientModel - check if client is a company or user
  let clientModel: 'User' | 'Company' = 'User'; // Default to User
  
  if (data.clientModel) {
    // If frontend explicitly passes it, use that
    clientModel = data.clientModel;
  } else {
    // ✅ Otherwise, query the database to determine the type
    try {
      // Try to find as Company first
      const company = await this.companyModel.findById(clientId);
      if (company) {
        clientModel = 'Company';
      }
    } catch (err) {
      // If not found as company, default to User (already set)
    }
  }

  // ✅ Also determine developer model
  let developerModel: 'User' | 'Company' = 'User';
  try {
    const devCompany = await this.companyModel.findById(service.clientId);
    if (devCompany) {
      developerModel = 'Company';
    }
  } catch (err) {
    // Developer is User
  }

  // ✅ Create the order with all required fields
  const order = new this.orderModel({
    serviceId: new Types.ObjectId(serviceId),
    developerId: service.clientId,
    developerModel: developerModel,         // ✅ Add developer model
    clientId: new Types.ObjectId(clientId),
    clientModel: clientModel,               // ✅ Now guaranteed to have a value
    title: data.title,
    description: data.description,
    price: data.price,
    platformFee,
    totalAmount,
    deliveryTime: data.deliveryTime,
    status: OrderStatus.PENDING_PAYMENT,
  });

  const savedOrder = await order.save();

  // ✅ CREATE THE MESSAGE with correct senderModel
  const orderMessage = new this.orderMessageModel({
    serviceId: new Types.ObjectId(serviceId),
    orderId: savedOrder._id,
    senderId: new Types.ObjectId(developerId),
    senderModel: developerModel, // ✅ Use developer model, not client model
    text: `${data.title} - ${data.description}`,
    type: MessageType.TEXT,
    timestamp: new Date(),
    isPaymentRequest: true,
    paymentDetails: {
      amount: actualAmount,
      type: paymentType,
      status: 'pending',
      orderId: savedOrder._id.toString(),
    },
  });

  await orderMessage.save();
  
  return { 
    order: savedOrder, 
    message: orderMessage 
  };
}

async getOrderById(orderId: string) {
  const order = await this.orderModel.findById(orderId)
    .populate('developerId', 'firstName lastName email paypalEmail companyName') 
    .populate('serviceId', 'title description deliveryTime');   

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  return order;
}



async getServiceOrders(serviceId: string, userId: string) {
  const service = await this.serviceModel.findById(serviceId);
  if (!service) throw new NotFoundException('Service not found');

  // FIX: Developer (service owner) OR client (buyer) can view orders
  const isServiceOwner = service.clientId.toString() === userId;
  const hasOrder = await this.orderModel.findOne({
    serviceId: new Types.ObjectId(serviceId),
    clientId: new Types.ObjectId(userId),
  });

  if (!isServiceOwner && !hasOrder) {
    throw new ForbiddenException('Access denied');
  }

  return await this.orderModel
    .find({ serviceId: new Types.ObjectId(serviceId) })
    .populate('developerId', 'firstName lastName email paypalEmail companyName')
    .populate('clientId', 'firstName lastName email paypalEmail companyName')
    .sort({ createdAt: -1 })
    .exec();
}




  // ==================== PAYPAL PAYMENT ====================
async createPayPalOrderForCustomOrder(orderId: string, clientId: string, clientModel: 'User' | 'Company' = 'User') {
  const order = await this.orderModel
    .findById(orderId)
    .populate('developerId', 'firstName lastName email paypalEmail companyName');

  if (!order) throw new NotFoundException('Order not found');

  // ✅ FIX: When assigning clientId, we MUST also assign clientModel 
  // because refPath: 'clientModel' makes it a required validation field.
  if (!order.clientId) {
    // This is a custom order that anyone can accept - assign the payer as client
    order.clientId = new Types.ObjectId(clientId);
    order.clientModel = clientModel; // ✅ Set the model type (User or Company)
    await order.save();
  } else if (order.clientId.toString() !== clientId) {
    // Order already has a client assigned, and it's not this user
    throw new ForbiddenException('This order has already been claimed by another client');
  }

  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    throw new BadRequestException('This order has already been paid');
  }
    
  const developer = order.developerId as any;
  if (!developer?.paypalEmail) {    
    throw new BadRequestException(
      'Developer has not set up their PayPal account yet'
    );
  }

  const PAYPAL_API =
    process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`,
  ).toString('base64');

  try {
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: order.totalAmount.toFixed(2),
            },
            description: `Order: ${order.title}`,
          },
        ],
        application_context: {
          brand_name: 'Your Marketplace',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
      },
    );

    order.paypalOrderId = response.data.id;
    await order.save();

    return { paypalOrderId: response.data.id };
  } catch (error) {
    console.error('PayPal error:', error.response?.data || error);
    throw new BadRequestException('Failed to create PayPal order');
  }
}


async updatePaymentStatus(
  messageId: string, 
  status: 'accepted' | 'declined',
  clientId?: string // The client who is accepting/declining
) {
  const message = await this.orderMessageModel.findById(messageId);
  if (!message) throw new NotFoundException('Message not found');
  
  if (!message.paymentDetails) {
    throw new BadRequestException('Not a payment request message');
  }

  // Update message status
  message.paymentDetails.status = status;
  
  // ✅ If accepted, update the order with the client who accepted
  if (status === 'accepted' && clientId && message.paymentDetails.orderId) {
    const order = await this.orderModel.findById(message.paymentDetails.orderId);
    if (order) {
      // Set the client who accepted the order
      order.clientId = new Types.ObjectId(clientId);
      await order.save();
    }
  }
  
  await message.save();
  return message;
}


async capturePayPalOrderForCustomOrder(
  orderId: string,
  paypalOrderId: string,
  clientId: string,
) {
  const order = await this.orderModel.findById(orderId);
  if (!order) throw new NotFoundException('Order not found');

  if (order.clientId.toString() !== clientId) {
    throw new ForbiddenException('Access denied');
  }

  const PAYPAL_API =
    process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`,
  ).toString('base64');

  try {
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}/capture`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
      },
    );

    if (response.data.status === 'COMPLETED') {
      order.status = OrderStatus.PAID;
      order.paypalCaptureId =
        response.data.purchase_units[0].payments.captures[0].id;
      order.paidAt = new Date();
      await order.save();

      // ✅ FIX: Determine sender model
      let senderModel: 'User' | 'Company' = 'User';
      
      // Option 1: Use order's clientModel field (if you added it)
      if (order.clientModel) {
        senderModel = order.clientModel as 'User' | 'Company';
      } else {
        // Option 2: Check database
        try {
          const company = await this.companyModel.findById(order.clientId);
          if (company) {
            senderModel = 'Company';
          }
        } catch (err) {
          // Default to User
        }
      }

      // ✅ Create message with senderModel
      const paymentMessage = new this.orderMessageModel({
        serviceId: order.serviceId,
        orderId: order._id,
        senderId: order.clientId,
        senderModel: senderModel,      
        text: `Payment sent! Order is now active.`,
        type: MessageType.PAYMENT_RECEIVED,
        timestamp: new Date(),
      });
      
      await paymentMessage.save();

      return { success: true, order, message: paymentMessage };
    }

    throw new BadRequestException('Payment not completed');
  } catch (error) {
    console.error('PayPal capture error:', error.response?.data || error);
    throw new BadRequestException('Failed to capture payment');
  }
}   
  // ==================== ORDER DELIVERY ====================

async startWork(orderId: string, developerId: string) {
  const order = await this.orderModel.findById(orderId);
  if (!order) throw new NotFoundException('Order not found');

  if (order.developerId.toString() !== developerId) {
    throw new ForbiddenException('Only the developer can start work');
  }

  if (order.status !== OrderStatus.PAID) {
    throw new BadRequestException('Order must be paid before starting work');
  }

  order.status = OrderStatus.IN_PROGRESS;
  await order.save();

  // ✅ FIX: Add senderModel (developer is sending)
  const workMessage = new this.orderMessageModel({
    serviceId: order.serviceId,
    orderId: order._id,
    senderId: new Types.ObjectId(developerId),
    senderModel: order.developerModel, // ✅ Use developer's model from order
    text: `Work has started on your order!`,
    type: MessageType.WORK_STARTED,
    timestamp: new Date(),
  });
  await workMessage.save();

  return { order, message: workMessage };
}

// 2. ✅ submitDelivery - Developer sends message
async submitDelivery(
  orderId: string,
  developerId: string,
  data: {
    deliveryNote: string;
    deliveryFiles?: string[];
  },
) {
  const order = await this.orderModel.findById(orderId);
  if (!order) throw new NotFoundException('Order not found');
  if (order.developerId.toString() !== developerId) {
    throw new ForbiddenException('Only the developer can submit delivery');
  }
  if (order.status !== OrderStatus.IN_PROGRESS) {
    throw new BadRequestException('Order must be in progress');
  }

  order.status = OrderStatus.DELIVERED;
  order.deliveryNote = data.deliveryNote;
  order.deliveryFiles = data.deliveryFiles || [];
  order.deliveredAt = new Date();
  await order.save();

  // ✅ FIX: Add senderModel (developer is sending)
  const deliveryMessage = new this.orderMessageModel({
    serviceId: order.serviceId,
    orderId: order._id,
    senderId: new Types.ObjectId(developerId),
    senderModel: order.developerModel, // ✅ Use developer's model from order
    text: `Delivery submitted! Please review and accept.`,
    type: MessageType.DELIVERY_SUBMITTED,
    timestamp: new Date(),
  });
  await deliveryMessage.save();

  return { order, message: deliveryMessage };
}

// 3. ✅ acceptDelivery - Client sends message
async acceptDelivery(
  orderId: string,
  clientId: string,
  data: { review?: string; rating?: number },
) {
  const order = await this.orderModel
    .findById(orderId)
    .populate('developerId', 'paypalEmail');

  if (!order) throw new NotFoundException('Order not found');

  if (order.clientId.toString() !== clientId) {
    throw new ForbiddenException('Only the client can accept delivery');
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new BadRequestException('Order must be delivered first');
  }

  order.status = OrderStatus.COMPLETED;
  order.completedAt = new Date();
  order.clientReview = data.review;
  order.clientRating = data.rating;
  await order.save();

  console.log(`💰 Releasing $${order.price} to developer`);

  // ✅ FIX: Add senderModel (client is sending)
  const completionMessage = new this.orderMessageModel({
    serviceId: order.serviceId,
    orderId: order._id,
    senderId: new Types.ObjectId(clientId),
    senderModel: order.clientModel, // ✅ Use client's model from order
    text: `Order completed! Payment released to developer.`,
    type: MessageType.ORDER_COMPLETED,
    timestamp: new Date(),
  });
  await completionMessage.save();

  return { order, message: completionMessage };
}

// 4. ✅ sendMessage - Regular chat message
async sendMessage(serviceId: string, text: string, senderId: string) {
  // ✅ FIX: Determine sender model
  let senderModel: 'User' | 'Company' = 'User';
  
  try {
    const company = await this.companyModel.findById(senderId);
    if (company) {
      senderModel = 'Company';
    }
  } catch (err) {
    // Default to User
  }

  // ✅ FIX: Add senderModel
  const message = await this.orderMessageModel.create({
    serviceId: new Types.ObjectId(serviceId),
    senderId: new Types.ObjectId(senderId),
    senderModel: senderModel, // ✅ REQUIRED
    text,
    type: MessageType.TEXT,
    timestamp: new Date(),
  });

  return message;
}
  // async acceptDelivery(
  //   orderId: string,
  //   clientId: string,
  //   data: {
  //     review?: string;
  //     rating?: number;
  //   },
  // ) {
  //   const order = await this.orderModel.findById(orderId).populate('developerId', 'paypalEmail');
  //   if (!order) throw new NotFoundException('Order not found');
  //   if (order.clientId.toString() !== clientId) {
  //     throw new ForbiddenException('Only the client can accept delivery');
  //   }
  //   if (order.status !== OrderStatus.DELIVERED) {
  //     throw new BadRequestException('Order must be delivered first');
  //   }

  //   order.status = OrderStatus.COMPLETED;
  //   order.completedAt = new Date();
  //   order.clientReview = data.review;
  //   order.clientRating = data.rating;
  //   await order.save();

  //   // TODO: Transfer payment to developer's PayPal account
  //   // This requires PayPal Payouts API
  //   console.log(`💰 Releasing $${order.price} to developer`);

  //   const completionMessage = new this.orderMessageModel({
  //     serviceId: order.serviceId,
  //     orderId: order._id,
  //     senderId: new Types.ObjectId(clientId),
  //     text: `Order completed! Payment released to developer.`,
  //     type: MessageType.ORDER_COMPLETED,
  //   });
  //   await completionMessage.save();

  //   return { order, message: completionMessage };
  // }

  // ==================== CHAT MESSAGES ====================

 async getServiceMessages(serviceId: string, userId: string) {
  const service = await this.serviceModel.findById(serviceId);
  if (!service) throw new NotFoundException('Service not found');

  const isServiceOwner = service.clientId.toString() === userId;

  const hasOrder = await this.orderModel.findOne({
    serviceId: new Types.ObjectId(serviceId),
    clientId: new Types.ObjectId(userId),
  });

  if (!isServiceOwner && !hasOrder) {
    throw new ForbiddenException('Access denied');
  }

  // ✅ FIX: Populate senderId dynamically based on senderModel
  const messages = await this.orderMessageModel
    .find({ serviceId: new Types.ObjectId(serviceId) })
    .sort({ timestamp: 1 })
    .exec();

  // Manually populate based on senderModel
  const populatedMessages = await Promise.all(
    messages.map(async (msg) => {
      const msgObj = msg.toObject();
      
      if (msgObj.senderModel === 'Company') {
        const company = await this.companyModel
          .findById(msgObj.senderId)
          .select('firstName lastName companyName email')
          .lean();
        
        return {
          ...msgObj,
          senderId: company || msgObj.senderId,
        };
      } else {
        // Assume User model - you need to inject UserModel
        const user = await this.userModel
          .findById(msgObj.senderId)
          .select('firstName lastName email')
          .lean();
        
        return {
          ...msgObj,
          senderId: user || msgObj.senderId,
        };
      }
    })
  );

  return populatedMessages;
}


  // ==================== STATS (Keep as is) ====================

  async getClientStats(clientId: string) {
    const services = await this.serviceModel.find({
      clientId: new Types.ObjectId(clientId),
    });

    const orders = await this.orderModel.find({
      clientId: new Types.ObjectId(clientId),
    });

    return {
      totalServices: services.length,
      openServices: services.filter((s) => s.status === ServiceStatus.OPEN).length,
      inProgressServices: services.filter((s) => s.status === ServiceStatus.IN_PROGRESS).length,
      completedServices: services.filter((s) => s.status === ServiceStatus.COMPLETED).length,
      totalSpent: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    };
  }

  async getDeveloperStats(developerId: string) {
    const applications = await this.applicationModel.find({
      developerId: new Types.ObjectId(developerId),
    });

    const orders = await this.orderModel.find({
      developerId: new Types.ObjectId(developerId),
      status: OrderStatus.COMPLETED,
    });

    return {
      totalApplications: applications.length,
      pendingApplications: applications.filter((a) => a.status === ApplicationStatus.PENDING)
        .length,
      acceptedApplications: applications.filter((a) => a.status === ApplicationStatus.ACCEPTED)
        .length,
      totalEarnings: orders.reduce((sum, o) => sum + o.price, 0),
    };
  }
}