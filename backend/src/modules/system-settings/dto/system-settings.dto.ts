import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SystemSettingsResponseDto {
  @ApiProperty({ example: true })
  aiQueryChatEnabled: boolean;
}

export class UpdateSystemSettingsDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  aiQueryChatEnabled: boolean;
}
