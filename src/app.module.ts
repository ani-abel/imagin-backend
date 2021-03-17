import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { GoogleDriveEndpointsModule } from './google-drive-endpoints/google-drive-endpoints.module';

@Module({
  imports: [
    GoogleDriveEndpointsModule,
    ScheduleModule.forRoot(),
    MulterModule.register({
      dest: '/uploads',
    })
  ]
})
export class AppModule {}
