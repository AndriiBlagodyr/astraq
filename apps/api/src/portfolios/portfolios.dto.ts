import {
  CashTransferBodySchema,
  CreatePortfolioBodySchema,
  OrderListSchema,
  OrderSchema,
  PlaceOrderBodySchema,
  PortfolioIdParamSchema,
  PortfolioListSchema,
  PortfolioOrderParamSchema,
  PortfolioSchema,
} from '@astraq/shared';
import { createZodDto } from 'nestjs-zod';

export class PortfolioIdParamDto extends createZodDto(PortfolioIdParamSchema) {}
export class PortfolioOrderParamDto extends createZodDto(
  PortfolioOrderParamSchema,
) {}
export class CreatePortfolioBodyDto extends createZodDto(
  CreatePortfolioBodySchema,
) {}
export class CashTransferBodyDto extends createZodDto(CashTransferBodySchema) {}
export class PlaceOrderBodyDto extends createZodDto(PlaceOrderBodySchema) {}
export class PortfolioListDto extends createZodDto(PortfolioListSchema) {}
export class PortfolioDto extends createZodDto(PortfolioSchema) {}
export class OrderListDto extends createZodDto(OrderListSchema) {}
export class OrderDto extends createZodDto(OrderSchema) {}
