import { Module } from '@nestjs/common';
import { CleanupPolicyService } from './cleanup-policy.service';

@Module({
  providers: [CleanupPolicyService],
  exports: [CleanupPolicyService],
})
export class CleanupModule {}