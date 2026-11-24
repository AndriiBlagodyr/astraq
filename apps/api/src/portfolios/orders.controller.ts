import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IdempotencyKeySchema } from '@astraq/shared';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { ApiProblemResponses } from '../common/problem';
import { OrdersService } from './orders.service';
import {
  OrderDto,
  OrderListDto,
  OrderPreviewDto,
  PlaceOrderBodyDto,
  PortfolioIdParamDto,
  PortfolioOrderParamDto,
} from './portfolios.dto';

@ApiTags('orders')
@ApiBearerAuth()
@ApiProblemResponses()
@UseGuards(JwtAuthGuard)
@Controller('portfolios/:id/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({
    operationId: 'listOrders',
    summary: "A portfolio's orders with their fills, newest first",
  })
  @ZodResponse({ status: 200, type: OrderListDto })
  list(@Req() req: AuthenticatedRequest, @Param() { id }: PortfolioIdParamDto) {
    return this.orders.list(req.user.sub, id);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    operationId: 'placeOrder',
    summary: 'Place an order, at most once per Idempotency-Key',
    description:
      'A market order placed during the session fills at once at the latest known price; ' +
      'every other order waits for the next session it can fill in. An order the portfolio ' +
      "can't cover, or one over its limit per order, is a 422 and isn't stored. An order is sized by " +
      '`quantity` (shares) or by `amount` (dollars, before commission): an amount is turned into shares ' +
      'at the latest close with slippage, or at the limit, rounded down to a millionth of a share, and ' +
      'the order is stored in those shares. Repeating the request ' +
      'with the same Idempotency-Key returns the order the first one placed, with the ' +
      'response header `Idempotency-Replayed: true`; the same key with a different order is a 409.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'A value the client makes up for this placement (a UUID is fine): 1 to 128 printable ASCII characters.',
  })
  @ZodResponse({ status: 201, type: OrderDto })
  async place(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: PortfolioIdParamDto,
    @Headers('idempotency-key') rawKey: string | undefined,
    @Body() body: PlaceOrderBodyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = IdempotencyKeySchema.safeParse(rawKey);
    if (!key.success) {
      throw new BadRequestException(
        'The Idempotency-Key header is required: 1 to 128 printable ASCII characters',
      );
    }
    const { order, replayed } = await this.orders.place(
      req.user.sub,
      id,
      key.data,
      body,
    );
    if (replayed) res.setHeader('Idempotency-Replayed', 'true');
    return order;
  }

  @Post('preview')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'previewOrder',
    summary: 'What placing an order would do, without placing it',
    description:
      'When the order would fill, what it is expected to cost at the latest close or its limit, ' +
      'the cash left after it, and the reason it would be refused, if any. For an order sized by ' +
      '`amount`, `quantity` is the shares it comes to. Writes nothing.',
  })
  @ZodResponse({ status: 200, type: OrderPreviewDto })
  preview(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: PortfolioIdParamDto,
    @Body() body: PlaceOrderBodyDto,
  ) {
    return this.orders.preview(req.user.sub, id, body);
  }

  @Post(':orderId/cancel')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'cancelOrder',
    summary: 'Cancel an open order; 409 once it has filled or been rejected',
  })
  @ZodResponse({ status: 200, type: OrderDto })
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param() { id, orderId }: PortfolioOrderParamDto,
  ) {
    return this.orders.cancel(req.user.sub, id, orderId);
  }
}
