import { Module } from '@nestjs/common';
import { GoogleDriveEndpointsService } from './google-drive-endpoints.service';
import { GoogleDriveEndpointsController } from './google-drive-endpoints.controller';

@Module({
  providers: [GoogleDriveEndpointsService],
  controllers: [GoogleDriveEndpointsController]
})
export class GoogleDriveEndpointsModule {}
