import { ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Skips rate limiting for the health endpoint: docker/k8s probes and nginx
 * upstream checks hit it far more often than a human would, and a 429 on
 * /health marks the container unhealthy and cascades into restarts.
 */
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request?.path === "/health") {
      return true;
    }
    return super.shouldSkip(context);
  }
}
