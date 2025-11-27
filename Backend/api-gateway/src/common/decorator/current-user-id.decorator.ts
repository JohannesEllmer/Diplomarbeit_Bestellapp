import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentUserId = createParamDecorator((_d, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return (req.user?.id as string) ?? '00000000-0000-0000-0000-000000000001';
});
