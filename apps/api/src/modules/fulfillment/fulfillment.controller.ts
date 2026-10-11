import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators';
import { FulfillmentService } from './fulfillment.service';
import { UpdateFulfillmentDto } from './dto/update-fulfillment.dto';
import { FulfillmentQueryDto } from './dto/fulfillment-query.dto';

@ApiTags('fulfillment')
@Controller('fulfillments')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  @Get()
  @ApiOperation({ summary: 'List fulfillments (campaign creator)' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: FulfillmentQueryDto,
  ) {
    return this.fulfillmentService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fulfillment details' })
  @ApiParam({ name: 'id', description: 'Fulfillment UUID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.fulfillmentService.findById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fulfillment status & tracking' })
  @ApiParam({ name: 'id', description: 'Fulfillment UUID' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateFulfillmentDto,
  ) {
    return this.fulfillmentService.update(id, userId, dto);
  }
}
