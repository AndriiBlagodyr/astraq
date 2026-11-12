import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
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
  AddWatchlistItemBodyDto,
  ReorderWatchlistBodyDto,
  WatchlistDto,
  WatchlistIdParamDto,
  WatchlistItemParamDto,
  WatchlistListDto,
  WatchlistNameBodyDto,
} from './watchlists.dto';
import { WatchlistsService } from './watchlists.service';

@ApiTags('watchlists')
@ApiBearerAuth()
@ApiProblemResponses()
@UseGuards(JwtAuthGuard)
@Controller('watchlists')
export class WatchlistsController {
  constructor(private readonly watchlists: WatchlistsService) {}

  @Get()
  @ApiOperation({
    operationId: 'listWatchlists',
    summary: "The user's watchlists in their order, each with its movers",
  })
  @ZodResponse({ status: 200, type: WatchlistListDto })
  list(@Req() req: AuthenticatedRequest) {
    return this.watchlists.list(req.user.sub);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    operationId: 'createWatchlist',
    summary: 'Create an empty watchlist after the last one',
  })
  @ZodResponse({ status: 201, type: WatchlistDto })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: WatchlistNameBodyDto,
  ) {
    return this.watchlists.create(req.user.sub, body.name);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getWatchlist',
    summary: 'A watchlist with its symbols, last closes, and sparklines',
  })
  @ZodResponse({ status: 200, type: WatchlistDto })
  get(@Req() req: AuthenticatedRequest, @Param() { id }: WatchlistIdParamDto) {
    return this.watchlists.get(req.user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'renameWatchlist',
    summary: 'Rename a watchlist',
  })
  @ZodResponse({ status: 200, type: WatchlistDto })
  rename(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: WatchlistIdParamDto,
    @Body() body: WatchlistNameBodyDto,
  ) {
    return this.watchlists.rename(req.user.sub, id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    operationId: 'deleteWatchlist',
    summary: 'Delete a watchlist and its rows',
  })
  delete(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: WatchlistIdParamDto,
  ) {
    return this.watchlists.delete(req.user.sub, id);
  }

  @Post(':id/items')
  @HttpCode(201)
  @ApiOperation({
    operationId: 'addWatchlistItem',
    summary: 'Add a symbol to the end of a watchlist',
  })
  @ZodResponse({ status: 201, type: WatchlistDto })
  addItem(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: WatchlistIdParamDto,
    @Body() body: AddWatchlistItemBodyDto,
  ) {
    return this.watchlists.addItem(req.user.sub, id, body.ticker);
  }

  @Put(':id/items/order')
  @ApiOperation({
    operationId: 'reorderWatchlist',
    summary: 'Put the symbols of a watchlist in the given order',
  })
  @ZodResponse({ status: 200, type: WatchlistDto })
  reorder(
    @Req() req: AuthenticatedRequest,
    @Param() { id }: WatchlistIdParamDto,
    @Body() body: ReorderWatchlistBodyDto,
  ) {
    return this.watchlists.reorder(req.user.sub, id, body.tickers);
  }

  @Delete(':id/items/:ticker')
  @HttpCode(204)
  @ApiOperation({
    operationId: 'removeWatchlistItem',
    summary: 'Remove a symbol from a watchlist',
  })
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param() { id, ticker }: WatchlistItemParamDto,
  ) {
    return this.watchlists.removeItem(req.user.sub, id, ticker);
  }
}
