import {
    Controller,
    Get,
    Delete,
    Post,
    Res,
    Req,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
    Logger
} from '@nestjs/common';
import {
    ApiOperation,
    ApiProduces,
    ApiResponse,
    ApiTags,
    ApiConsumes,
    ApiBearerAuth
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Cron, CronExpression } from '@nestjs/schedule';
import { diskStorage } from "multer";
import {
    AlbumContentResponseDTO,
    AlbumListResponseDTO,
    AuthorizeURLDTO,
    AuthorizeUserResponseDTO,
    AvailableStorageSpaceDTO,
    CustomAPIType
} from './DTO/google-drive-endpoints.DTO';
import { GoogleDriveEndpointsService } from './google-drive-endpoints.service';
import { CurrentUser } from '../utils/current-user.decorator';
import { GoogleAuthGuard } from '../auth/guards/google-auth.guard';
import { MulterValidators } from '../validators/MulterValidators.validator';

@ApiTags("google-drive-endpoints")
@Controller('google-drive-endpoints')
export class GoogleDriveEndpointsController {
    constructor(private readonly googleDriveEndpointSrv: GoogleDriveEndpointsService) { }

    @ApiOperation({
        description:
            'Upload files to a folder on google drive',
    })
    @ApiConsumes('multipart/formdata')
    @ApiProduces('json')
    @ApiBearerAuth()
    @ApiResponse({
        type: [AlbumContentResponseDTO]
    })
    @UseInterceptors(FilesInterceptor('files[]', 20, {
        storage: diskStorage({
            destination: './uploads',
            filename: MulterValidators.preserveOriginalFileName,
        }),
        fileFilter: MulterValidators.imageFileFilter
    }))
    @UseGuards(GoogleAuthGuard)
    @Post("/upload-files")
    async uploadFiles(
        @CurrentUser() token: string,
        @UploadedFiles() images: any[],
        @Query("folderId") folderId: string
    ): Promise<AlbumContentResponseDTO[]> {
        return await this.googleDriveEndpointSrv.uploadMultipleFiles(images, folderId, token);
    }

    @ApiOperation({
        description: `Get an authorization URL for 
        users to grant access to their account`,
    })
    @ApiProduces('json')
    @ApiResponse({
        type: AuthorizeURLDTO,
    })
    @ApiConsumes('application/json')
    @Get("/authorize-drive")
    async authorizeDrive(): Promise<AuthorizeURLDTO> {
        return await this.googleDriveEndpointSrv.authorizeDrive();
    }

    @ApiOperation({
        description: `Generate an authtentication token and then redirect back to frontend`,
    })
    @Get("/google-callback")
    async googleCallback(@Req() req: any, @Res() res: any): Promise<void> {
        const redirectURL: string = await this.googleDriveEndpointSrv.generateGoogleAuthToken(req.query.code);
        res.redirect(redirectURL);
    }

    @ApiOperation({
        description: `Get available space in a user's google drive. All values are in megabytes`,
    })
    @ApiProduces('json')
    @ApiResponse({
        type: AvailableStorageSpaceDTO,
    })
    @ApiBearerAuth()
    @ApiConsumes('application/json')
    @UseGuards(GoogleAuthGuard)
    @Get("/get-available-drive-space")
    async getAvailableDriveSpace(@CurrentUser() token: string): Promise<AvailableStorageSpaceDTO> {
        return await this.googleDriveEndpointSrv.getAvailableDriveSpace(token);
    }

    @ApiOperation({
        description: `Search for a folder`,
    })
    @ApiProduces('json')
    @ApiConsumes('application/json')
    @ApiBearerAuth()
    @ApiResponse({
        type: [AlbumContentResponseDTO]
    })
    @UseGuards(GoogleAuthGuard)
    @Get("/search-folder")
    async searchFolder(
        @CurrentUser() token: string,
        @Query("searchQuery") searchQuery: string,
        @Query("folderId") folderId: string
    ): Promise<AlbumContentResponseDTO[]> {
        return await this.googleDriveEndpointSrv.searchFolder(searchQuery, token, folderId);
    }

    @ApiOperation({
        description: `Create a folder at the root of a user's google drive`,
    })
    @ApiProduces('json')
    @ApiBearerAuth()
    @ApiResponse({
        type: AlbumListResponseDTO,
    })
    @ApiConsumes('application/json')
    @UseGuards(GoogleAuthGuard)
    @Get("/create-folder")
    async createFolder(
        @CurrentUser() token: string,
        @Query("folderName") folderName: string
    ): Promise<AlbumListResponseDTO> {
        return await this.googleDriveEndpointSrv.createFolder(folderName, token);
    }

    @ApiOperation({
        description: `Download a file from a user's google drive`,
    })
    @ApiProduces('json')
    @ApiConsumes('application/json')
    @ApiBearerAuth()
    @UseGuards(GoogleAuthGuard)
    @Get("/download-file")
    async downloadFile(
        @CurrentUser() token: string,
        @Query("fileId") fileId: string,
        @Query("fileName") fileName: string,
        @Res() res: any
    ): Promise<any> {
        const filePath: string = await this.googleDriveEndpointSrv.downloadFile(fileId, fileName, token);
        res.download(filePath);

        //!!! Option 1
        // res.type("application/octet-stream");
        // res.attachment(filePath);

        //!!! Option 2
        //res.set("Content-Disposition", `inline;filename=${filePath}`);
    }

    @ApiOperation({
        description: `Get the 'contents' of a folder in google drive`,
    })
    @ApiProduces('json')
    @ApiConsumes('application/json')
    @ApiBearerAuth()
    @ApiResponse({
        type: [AlbumContentResponseDTO]
    })
    @UseGuards(GoogleAuthGuard)
    @Get("/get-folder-content")
    async getFolderContent(
        @CurrentUser() token: string,
        @Query("folderId") folderId: string
    ): Promise<AlbumContentResponseDTO[]> {
        return await this.googleDriveEndpointSrv.getFolderContent(folderId, token);
    }

    @ApiOperation({
        description: `Get all folder that are marked as albums in google drive`,
    })
    @ApiProduces('json')
    @ApiConsumes('application/json')
    @ApiBearerAuth()
    @ApiResponse({
        type: [AlbumListResponseDTO]
    })
    @UseGuards(GoogleAuthGuard)
    @Get("/get-folders")
    async getFolders(
        @CurrentUser() token: string
    ): Promise<AlbumListResponseDTO[]> {
        return await this.googleDriveEndpointSrv.getFolders(token);
    }

    @ApiOperation({
        description: `Get the logged in users details`,
    })
    @ApiProduces('json')
    @ApiConsumes('application/json')
    @ApiBearerAuth()
    @ApiResponse({
        type: AuthorizeUserResponseDTO
    })
    @UseGuards(GoogleAuthGuard)
    @Get("/get-user-details")
    async getUserDetails(@CurrentUser() token: string): Promise<AuthorizeUserResponseDTO> {
        return await this.googleDriveEndpointSrv.getUserDetails(token);
    }

    @ApiOperation({
        description: `Delete file from drive`,
    })
    @ApiProduces('json')
    @ApiResponse({
        type: CustomAPIType,
    })
    @ApiConsumes('application/json')
    @ApiBearerAuth()
    @UseGuards(GoogleAuthGuard)
    @Delete("/delete-file")
    async deleteFile(
        @CurrentUser() token: string,
        @Query("fileId") fileId: string
    ): Promise<CustomAPIType> {
        return this.googleDriveEndpointSrv.deleteFile(fileId, token);
    }

    @ApiOperation({
        description: `Empty a google trash bin`,
    })
    @ApiProduces('json')
    @ApiBearerAuth()
    @ApiResponse({
        type: CustomAPIType,
    })
    @ApiConsumes('application/json')
    @UseGuards(GoogleAuthGuard)
    @Delete("/empty-trash")
    async emptyTrash(@CurrentUser() token: string): Promise<CustomAPIType> {
        return await this.googleDriveEndpointSrv.emptyTrash(token);
    }

    //!!! Use a CRON job to Delete all files in the "downloads" every 2 hours
    @Cron(CronExpression.EVERY_2_HOURS)
    async handleCronEvery2Hours(): Promise<void> {
        const info: string = await this.googleDriveEndpointSrv.deleteFileFromFolder("./downloads");
        new Logger("Google-Drive-Endpoint").debug(info);
    }

    //Return mapped fields for 
    // - Search-albums (return only pictures)
    // - Create-album
    //- Get folders
    //- Upload pictures
}
