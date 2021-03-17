import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private unauthorizedErrorMessage = "Unauthorized...You need a token to access this route";
  private logger: Logger = new Logger("Auth-Guard");

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      return this.validateRequest(request);
    }
    catch (ex) {
      this.logger.error(ex);
      throw ex;
    }
  }

  private validateRequest(request: any)
    : Observable<boolean> | Promise<boolean> | boolean {
    try {
      let returnValue = false;

      if (request.headers.authorization) {
        const rawToken: string = (request.headers.authorization as string)?.split("***")[1];//splits token that will be prefixed by string: "Bearer"
        if (!rawToken) {
          throw new UnauthorizedException(this.unauthorizedErrorMessage);
        }

        const parsedTokenExpiryDate = parseInt(JSON.parse(rawToken)["expiry_date"]);
        if (Date.now() <= parsedTokenExpiryDate) {
          request.userToken = rawToken;
          returnValue = true;
        }
        else {
          throw new ForbiddenException("Forbidden...You're using an expired token");
        }
      }
      else throw new UnauthorizedException(this.unauthorizedErrorMessage);

      return returnValue;
    }
    catch (ex) {
      this.logger.error(ex);
      throw ex;
    }
  }
}
