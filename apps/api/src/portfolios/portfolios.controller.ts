import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { ApiProblemResponses } from '../common/problem';
import {
  CashTransferBodyDto,
  CreatePortfolioBodyDto,
  PortfolioDto,
  PortfolioIdParamDto,
  PortfolioListDto,
} from './portfolios.dto';
import { PortfoliosService } from './portfolios.service';

@ApiTags('portfolios')
@ApiBearerAuth()
@ApiProblemResponses()
@UseGuards(JwtAuthGuard)
@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfolios: PortfoliosService) {}

  @Get()
  @ApiOperation({
    operationId: 'listPortfolios',
    summary: "The user's paper portfolios, oldest first",
  })
  @ZodResponse({ status: 200, type: PortfolioListDto })
  list(@Req() req: AuthenticatedRequest) {
    return this.portfolios.list(req.user.sub);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    operationId: 'createPortfolio',
    summary: 'Create a paper portfolio with its starting cash and trading costs',
  })
  @ZodResponse({ status: 201, type: PortfolioDto })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreatePortfolioBodyDto,
  ) {
    return this.portfolios.create(req.user.sub, body);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getPortfolio',
    summary: 'A portfolio with its cash, positions at cost, and PnL, from its ledger',
  })
  @ZodResponse({ status: 200, type: PortfolioDto })
  get(@Req() req: AuthenticatedRequest, @Param() { id }: PortfolioIdParamDto) {
    return this.portfolios.get(req.user.sub, id);
  }

  @Post(':id/transfers')
  @HttpCode(201)
  @ApiOperation({
    operationId: 'transferCash',
    summary: 'Deposit cash into a portfolio or withdraw it',
  })
  @ZodResponse({ status: 201, type: PortfolioDto })
  transfer(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: PortfolioIdParamDto,
    @Body() body: CashTransferBodyDto,
  ) {
    return this.portfolios.transfer(req.user.sub, id, body);
  }
}
