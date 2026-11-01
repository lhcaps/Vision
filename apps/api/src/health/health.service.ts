import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PostgresHealthService } from './services/postgres-health.service';
import { RedisHealthService } from './services/redis-health.service';
import { MinioHealthService } from './services/minio-health.service';
import { CvWorkerHealthService } from './services/cv-worker-health.service';
import { HealthResponseDto, DependencyHealthDto } from './dto/health-response.dto';
import { RuntimeStatusResponseDto } from './dto/runtime-status-response.dto';
import { detectMode } from '../config/app-mode';

@Injectable()
export class HealthService {
  constructor(
    private readonly postgresHealth: PostgresHealthService,
    private readonly redisHealth: RedisHealthService,
    private readonly minioHealth: MinioHealthService,
    private readonly cvWorkerHealth: CvWorkerHealthService
  ) {}

  async deepCheck(): Promise<HealthResponseDto> {
    const [postgres, redis, minio, cvWorker] = await Promise.all([
      this.postgresHealth.check(),
      this.redisHealth.check(),
      this.minioHealth.check(),
      this.cvWorkerHealth.check(),
    ]);

    const allUp = [postgres, redis, minio, cvWorker].every(
      (d: DependencyHealthDto) => d.status === 'up'
    );

    const response: HealthResponseDto = {
      status: allUp ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: process.env.npm_package_version ?? '0.0.0',
      dependencies: { postgres, redis, minio, cvWorker },
    };

    if (!allUp) {
      throw new ServiceUnavailableException(response);
    }
    return response;
  }

  async getRuntimeStatus(): Promise<RuntimeStatusResponseDto> {
    const dataMode = detectMode();
    const [postgres, redis, minio, cvWorker] = await Promise.all([
      this.postgresHealth.check(),
      this.redisHealth.check(),
      this.minioHealth.check(),
      this.cvWorkerHealth.check(),
    ]);

    const queueMode = process.env.INFERENCE_QUEUE_MODE ?? 'memory';
    const queueConfigured = queueMode === 'bullmq';
    const queueUp = redis.status === 'up';

    let queueStatus: RuntimeStatusResponseDto['queue']['status'];
    if (queueConfigured && queueUp) {
      queueStatus = 'ready';
    } else if (queueConfigured && !queueUp) {
      queueStatus = 'unavailable';
    } else if (queueMode === 'memory' || !queueConfigured) {
      queueStatus = 'fallback';
    } else {
      queueStatus = 'unknown';
    }

    const cvWorkerDetails = cvWorker.details as
      | {
          version?: string;
          capabilities?: Record<string, unknown>;
          error?: string;
          note?: string;
        }
      | undefined;

    const cvCapabilities = cvWorkerDetails?.capabilities;
    const onnxInfo = cvCapabilities?.onnxDetector as
      | { available?: boolean; mode?: string; modelVersion?: string; modelPath?: string }
      | undefined;
    const mediaInfo = cvCapabilities?.mediaProcessing as
      | { thumbnail?: boolean; frameExtraction?: { available?: boolean } }
      | undefined;

    const cvConfigured = Boolean(process.env.CV_WORKER_URL) && process.env.CV_WORKER_URL !== 'mock';

    const requestedDetectorMode = process.env.CV_WORKER_DETECTOR_MODE === 'onnx' ? 'onnx' : 'mock';

    return {
      api: {
        ok: true,
        mode: dataMode,
      },
      database: {
        ok: postgres.status === 'up',
        status: postgres.status === 'up' ? 'ready' : 'unavailable',
      },
      queue: {
        ok: queueUp ? true : queueStatus === 'fallback' ? null : false,
        mode: queueConfigured ? 'bullmq' : 'memory',
        status: queueStatus,
      },
      cvWorker: {
        ok: cvWorker.status === 'up',
        configured: cvConfigured,
        url: cvConfigured ? (process.env.CV_WORKER_URL ?? null) : null,
        requestedDetectorMode,
        activeDetectorMode: onnxInfo?.mode ?? null,
        onnxAvailable: onnxInfo?.available ?? null,
        modelVersion: onnxInfo?.modelVersion ?? null,
        modelPath: onnxInfo?.modelPath ?? null,
        frameExtractionAvailable: mediaInfo?.frameExtraction?.available ?? null,
        error: cvWorkerDetails?.error ?? cvWorkerDetails?.note ?? null,
      },
    };
  }
}
