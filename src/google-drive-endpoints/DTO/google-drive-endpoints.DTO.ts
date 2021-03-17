import { ApiProperty } from "@nestjs/swagger";

export enum OperationStatus {
    SUCCESSFULL = "SUCCESSFUL",
    FAILED = "FAILED"
}

export class AuthorizeURLDTO {
    @ApiProperty()
    AuthURL: string;
}

export class AvailableStorageSpaceDTO {
    @ApiProperty()
    TotalSpaceInMB: number;

    @ApiProperty()
    UsedSpaceInMB: number
}

export class CustomAPIType {
    @ApiProperty()
    Message: string;

    @ApiProperty({
        enum: OperationStatus
    })
    OperationType: OperationStatus;
}

export class AuthorizeUserResponseDTO {
    @ApiProperty()
    Token: string;

    @ApiProperty()
    Username: string;

    @ApiProperty()
    ProfileImage: string;

    @ApiProperty()
    FirstName: string;

    @ApiProperty()
    LastName: string;
}

export class AlbumListResponseDTO {
    @ApiProperty()
    FolderId: string;

    @ApiProperty()
    FolderName: string;

    @ApiProperty()
    ParentId: string;
}

export class AlbumContentResponseDTO {
    @ApiProperty()
    FileId: string;

    @ApiProperty()
    FileName: string;

    @ApiProperty()
    ParentId: string;

    @ApiProperty()
    ViewLink: string;//Same as Download link
}