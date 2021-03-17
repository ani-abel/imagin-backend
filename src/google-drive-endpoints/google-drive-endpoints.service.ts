import { Injectable, Logger } from '@nestjs/common';
import { google } from "googleapis";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { NODE_ENV, NODE_ENV_TYPE } from "../utils/enum.type";
import {
    AlbumListResponseDTO,
    AuthorizeURLDTO,
    AvailableStorageSpaceDTO,
    CustomAPIType,
    OperationStatus,
    AlbumContentResponseDTO
} from './DTO/google-drive-endpoints.DTO';
import { ConvertByteToMegabytes } from '../utils/shared.function';
import { SCOPES } from '../utils/app.constant';
import { AuthorizeUserResponseDTO } from './DTO/google-drive-endpoints.DTO';

dotenv.config();

const {
    GOOGLE_CLIENT_ID_DEV,
    GOOGLE_CLIENT_SECRET_DEV,
    GOOGLE_CLIENT_ID_PROD,
    GOOGLE_CLIENT_SECRET_PROD,
    GOOGLE_REDIRECT_URL_DEV,
    GOOGLE_REDIRECT_URL_PROD,
} = process.env;

@Injectable()
export class GoogleDriveEndpointsService {
    private logger: Logger = new Logger("Google-Drive-Endpoint-Service");
    private oAuth2Client = NODE_ENV === NODE_ENV_TYPE.DEVELOPMENT ?
        new google.auth.OAuth2(
            GOOGLE_CLIENT_ID_DEV,
            GOOGLE_CLIENT_SECRET_DEV,
            GOOGLE_REDIRECT_URL_DEV
        ) :
        new google.auth.OAuth2(
            GOOGLE_CLIENT_ID_PROD,
            GOOGLE_CLIENT_SECRET_PROD,
            GOOGLE_REDIRECT_URL_PROD
        );

    async authorizeDrive(): Promise<AuthorizeURLDTO> {
        try {
            const url: string = this.oAuth2Client.generateAuthUrl({
                access_type: "offline",
                scope: SCOPES
            });
            return { AuthURL: url };
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async generateGoogleAuthToken(code: string): Promise<string> {
        try {
            const token = await new Promise((resolve, reject) => {
                this.oAuth2Client.getToken(code, function (ex, token) {
                    if (ex) {
                        reject(ex);
                    } else {
                        resolve(token);
                    }
                });
            });

            return `${NODE_ENV === "development"
                ? "http://localhost:4200"
                : "https://reservia-frontend.web.app"
                }/#/home?provider=google&code=${JSON.stringify(token)}`;

        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async searchFolder(searchQuery: string, token: any, folderId: string)
        : Promise<AlbumContentResponseDTO[]> {
        try {
            const tokenToJson = JSON.parse(token);
            this.oAuth2Client.setCredentials(tokenToJson);
            const googleDriveObj = google.drive({ version: "v3", auth: this.oAuth2Client });

            const folders: any = await new Promise((resolve, reject) => {
                googleDriveObj.files.list(
                    {
                        q: `name contains '${searchQuery}'`,
                        spaces: "drive",
                        fields: "*",
                        orderBy: "name desc"
                    },
                    (err, file) => {
                        if (err) {
                            reject(err);
                        }
                        if (file) {
                            resolve(file);
                        }
                    }
                );
            });

            if ("files" in folders.data) {
                //return (folders.data["files"] as any[]).filter((file) => (file.name as string).startsWith("ALB") || (file.name as string).startsWith("PIC"));
                //? Only return search results that exist in the curent folder
                return (folders.data["files"] as any[]).filter((file) => (file.name as string)?.startsWith("PIC") && file.parents[0] === folderId)
                    .map((content: any) => {
                        const { id, name, parents, webContentLink } = content;
                        return {
                            FileId: id,
                            FileName: name,
                            ParentId: parents[0],
                            ViewLink: webContentLink
                        }
                    });
            }
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async getFolders(token: any): Promise<AlbumListResponseDTO[]> {
        try {
            const response: AlbumContentResponseDTO[] = await this.getFolderContent("root", token);
            if (Array.isArray(response)) {
                return response.filter((content: AlbumContentResponseDTO) => content.FileName.startsWith("ALB"))
                    .map((content: AlbumContentResponseDTO) => {
                        const { FileId, FileName, ParentId } = content;
                        return {
                            ParentId,
                            FolderId: FileId,
                            FolderName: FileName
                        }
                    });
            }
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async getAvailableDriveSpace(token: any): Promise<AvailableStorageSpaceDTO> {
        try {
            const tokenToJson = JSON.parse(token);
            this.oAuth2Client.setCredentials(tokenToJson);
            const googleDriveObj = google.drive({ version: "v3", auth: this.oAuth2Client });

            const res: any = await new Promise((resolve, reject) => {
                googleDriveObj.about.get(
                    {
                        fields: "*",
                    },
                    (err, res) => {
                        if (err) {
                            reject(err);
                        }
                        if (res) {
                            resolve(res);
                        }
                    }
                );
            });
            const { storageQuota } = res.data;
            return {
                TotalSpaceInMB: ConvertByteToMegabytes(parseInt(storageQuota.limit)),
                UsedSpaceInMB: ConvertByteToMegabytes(parseInt(storageQuota.usageInDrive))
            };
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async getFolderContent(folderId: string, token: any): Promise<AlbumContentResponseDTO[]> {
        try {
            const tokenToJson = JSON.parse(token);
            this.oAuth2Client.setCredentials(tokenToJson);
            const googleDriveObj = google.drive({ version: "v3", auth: this.oAuth2Client });

            const childrenFiles: any = await new Promise((resolve, reject) => {
                googleDriveObj.files.list(
                    {
                        q: `'${folderId}' in parents and trashed = false`,
                        spaces: "drive",
                        fields: "*",
                        orderBy: "name desc",
                    },
                    (err, file) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(file);
                        }
                    }
                );
            });

            if ("files" in childrenFiles.data) {
                return (childrenFiles.data["files"] as any[]).map((file) => {
                    const { id, name, parents, webContentLink } = file;
                    return {
                        FileId: id,
                        FileName: name,
                        ParentId: parents[0],
                        ViewLink: webContentLink
                    };
                });
            }
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async deleteFile(fileId: string, token: any): Promise<CustomAPIType> {
        try {
            const tokenToJson = JSON.parse(token);
            this.oAuth2Client.setCredentials(tokenToJson);

            const googleDriveObj = google.drive({ version: "v3", auth: this.oAuth2Client });
            const res: any = await googleDriveObj.files.delete({
                fileId
            });

            if (res) {
                return {
                    Message: "File deleted",
                    OperationType: OperationStatus.SUCCESSFULL
                };
            }
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async downloadFile(fileId: string, fileName: string, token: any): Promise<string> {
        try {
            const destinationFolder = "./downloads";
            const filePath = `${destinationFolder}/${fileName}`;
            const dest = fs.createWriteStream(filePath); // file path where google drive function will save the file

            this.oAuth2Client.setCredentials(token);
            const googleDriveObj = google.drive({ version: "v3", auth: this.oAuth2Client });

            const driveResponse = await googleDriveObj.files.get(
                { fileId, alt: "media" },
                { responseType: "stream" }
            );

            let progress = 0;
            driveResponse.data
                .on("end", () => {
                    console.log("\nDone downloading file.");
                    /**
                     * ? Why does response.download not work on fastify
                     * use Field: "webContentLink" on the frontend as doenload link
                     * @TODO find a way to download files that reach the server
                     */
                    //response.download(filePath); // Set disposition and send it.
                })
                .on("error", (err) => {
                    throw new Error(`Error downloading file: ${err}`);
                })
                .on("data", (data) => {
                    progress += data.length;
                    if (process.stdout.isTTY) {
                        readline.clearLine(process.stdout, 0);
                        readline.cursorTo(process.stdout, 0, null);
                        process.stdout.write(`Downloaded ${progress} bytes`);
                    }
                })
                .pipe(dest);

            return filePath;
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async createFolder(folderName: string, token: any): Promise<AlbumListResponseDTO> {
        try {
            const tokenToJson = JSON.parse(token);
            this.oAuth2Client.setCredentials(tokenToJson);

            //!!!- Always create a folder in the Root of a user's drive
            const requestBody = {
                name: `ALB-${folderName}`.toUpperCase(),
                mimeType: "application/vnd.google-apps.folder",
                parents: ["root"],
            };
            const googleDriveObj = google.drive({ version: "v3", auth: this.oAuth2Client });
            const res: any = await new Promise((resolve, reject) => {
                googleDriveObj.files.create(
                    {
                        fields: "*",
                        requestBody,
                    },
                    (err, res) => {
                        if (err) {
                            reject(err);
                        }
                        if (res) {
                            resolve(res);
                        }
                    }
                );
            });

            if (res.data) {
                const { id, name, parents } = res.data;
                return {
                    FolderId: id,
                    FolderName: name,
                    ParentId: parents[0]
                };
            }
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async getUserDetails(token: any): Promise<AuthorizeUserResponseDTO> {
        const tokenToJson = JSON.parse(token);
        this.oAuth2Client.setCredentials(tokenToJson);
        const oauth2 = google.oauth2({
            auth: this.oAuth2Client,
            version: "v2"
        });
        const userData: any = await new Promise((resolve, reject) => {
            oauth2.userinfo.get(function (err, res) {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
        const { name, given_name, family_name, picture } = userData.data;
        return {
            ProfileImage: picture,
            Token: JSON.stringify(token),
            Username: name,
            FirstName: given_name,
            LastName: family_name
        };
    }

    async emptyTrash(token: any): Promise<CustomAPIType> {
        try {
            const tokenToJson = JSON.parse(token);
            this.oAuth2Client.setCredentials(tokenToJson);
            const googleDriveObj = google.drive({ version: "v3", auth: this.oAuth2Client });

            await new Promise((resolve, reject) => {
                googleDriveObj.files.emptyTrash(
                    {
                        fields: "*",
                        auth: this.oAuth2Client,
                    },
                    (err, res) => {
                        if (err) {
                            reject(err);
                        }
                        if (res) {
                            resolve(res);
                        }
                    }
                );
            });

            return {
                Message: "Trash emptied",
                OperationType: OperationStatus.SUCCESSFULL
            };
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async uploadMultipleFiles(files: any[], folderId: string, token: any)
        : Promise<AlbumContentResponseDTO[]> {
        try {
            const uploadedFileArray: any[] = [];
            for (const file of files) {
                const uploadedFile = await this.uploadFile(file, folderId, token);
                uploadedFileArray.push(uploadedFile);
            }
            return (uploadedFileArray as any[]).map((content: any) => {
                const { id, name, webContentLink } = content;
                return {
                    FileId: id,
                    FileName: name,
                    ParentId: folderId,
                    ViewLink: webContentLink
                }
            });
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    private async uploadFile(file: any, folderId: string, token: any): Promise<any> {
        try {
            const tokenToJson = JSON.parse(token);
            this.oAuth2Client.setCredentials(tokenToJson);
            const googleDriveObj = google.drive({ version: "v3", auth: this.oAuth2Client });

            const { path, filename, mimetype } = file;
            const media = {
                mimeType: mimetype,
                body: fs.createReadStream(path),
            };
            const requestBody = {
                name: `PIC-${filename}`.toUpperCase(),
                mimeType: mimetype,
                parents: [folderId],
            };

            const res: any = await new Promise((resolve, reject) => {
                googleDriveObj.files.create(
                    {
                        requestBody,
                        media,
                        fields: "id, name, kind, mimeType, webContentLink",
                    },
                    (err, res) => {
                        if (err) {
                            reject(err);
                        }
                        if (file) {
                            fs.unlinkSync(path);
                        }
                        resolve(res);
                    }
                );
            });

            return res.data;
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }

    async deleteFileFromFolder(folderPath: string): Promise<string> {
        try {
            return new Promise((resolve, reject) => {
                fs.readdir(folderPath, (err, files) => {
                    if (err) reject(err);

                    for (const file of files) {
                        fs.unlink(path.join(folderPath, file), err => {
                            if (err) throw err;
                        });
                    }
                    resolve(`Files deleted from '${folderPath}'`);
                });
            })
        }
        catch (ex) {
            this.logger.error(ex);
            throw ex;
        }
    }
}
