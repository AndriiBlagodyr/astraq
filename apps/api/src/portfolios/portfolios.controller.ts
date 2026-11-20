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
  ActivityListDto,
  CashTransferBodyDto,
  CreatePortfolioBodyDto,
  EquityCurveDto,
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
    summary:
      'A portfolio with its cash, PnL, and positions at cost and at their latest close',
  })
  @ZodResponse({ status: 200, type: PortfolioDto })
  get(@Req() req: AuthenticatedRequest, @Param() { id }: PortfolioIdParamDto) {
    return this.portfolios.get(req.user.sub, id);
  }

  @Get(':id/activity')
  @ApiOperation({
    operationId: 'listActivity',
    summary:
      "A portfolio's ledger as a timeline: fills, cash moves, splits, and dividends, newest first",
    description:
      'One line per ledger transaction, with what it did to cash and the cash after it. ' +
      "The newest line's `cashAfter` is the portfolio's cash.",
  })
  @ZodResponse({ status: 200, type: ActivityListDto })
  activity(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: PortfolioIdParamDto,
  ) {
    return this.portfolios.activity(req.user.sub, id);
  }

  @Get(':id/equity')
  @ApiOperation({
    operationId: 'getEquityCurve',
    summary:
      "What a portfolio was worth at each day's close, with the day's gain or loss",
    description:
      'The ledger replayed a day at a time against the closes, oldest first. ' +
      "The last point's `equity` is the portfolio's and its `pnl` is the day PnL.",
  })
  @ZodResponse({ status: 200, type: EquityCurveDto })
  equity(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: PortfolioIdParamDto,
  ) {
    return this.portfolios.equity(req.user.sub, id);
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
