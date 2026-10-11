import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators';
import { PledgesService } from './pledges.service';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { UpdatePledgeDto } from './dto/update-pledge.dto';
import { PledgeQueryDto } from './dto/pledge-query.dto';

@ApiTags('pledges')
@Controller('pledges')
export class PledgesController {
  constructor(private readonly pledgesService: PledgesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a pledge (back a campaign)' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePledgeDto,
  ) {
    return this.pledgesService.create(userId, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my pledges' })
  async findMyPledges(
    @CurrentUser('id') userId: string,
    @Query() query: PledgeQueryDto,
  ) {
    return this.pledgesService.findMyPledges(userId, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pledge details' })
  @ApiParam({ name: 'id', description: 'Pledge UUID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pledgesService.findById(id, userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a pledge' })
  @ApiParam({ name: 'id', description: 'Pledge UUID' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePledgeDto,
  ) {
    return this.pledgesService.update(id, userId, dto);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pledge' })
  @ApiParam({ name: 'id', description: 'Pledge UUID' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pledgesService.cancel(id, userId);
  }
}
