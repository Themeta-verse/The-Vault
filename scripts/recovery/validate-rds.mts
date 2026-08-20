import { createHash } from "node:crypto";
import { DescribeExportTasksCommand, RDSClient } from "@aws-sdk/client-rds";
import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const recoveryBucket = process.env.RECOVERY_ARTIFACT_BUCKET;
const maxAgeHours = Number(process.env.RECOVERY_MAX_AGE_HOURS ?? "168");
if (!region || !recoveryBucket) {
  throw new Error("AWS_REGION and RECOVERY_ARTIFACT_BUCKET are required");
}
if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
  throw new Error("RECOVERY_MAX_AGE_HOURS must be a positive number");
}

const rds = new RDSClient({ region });
const s3 = new S3Client({ region });
const response = await rds.send(
  new DescribeExportTasksCommand({ MaxRecords: 100 })
);
const completed = (response.ExportTasks ?? [])
  .filter(
    task => task.Status === "COMPLETE" && task.TaskEndTime && task.S3Prefix
  )
  .sort(
    (left, right) =>
      (right.TaskEndTime?.getTime() ?? 0) - (left.TaskEndTime?.getTime() ?? 0)
  )[0];
if (
  !completed?.ExportTaskIdentifier ||
  !completed.TaskEndTime ||
  !completed.S3Prefix
) {
  throw new Error(
    "No completed RDS recovery export is available for validation"
  );
}
const ageHours =
  (Date.now() - completed.TaskEndTime.getTime()) / (60 * 60 * 1000);
if (ageHours > maxAgeHours) {
  throw new Error(
    `Latest completed recovery export is stale (${ageHours.toFixed(1)}h)`
  );
}

const objects = await s3.send(
  new ListObjectsV2Command({
    Bucket: recoveryBucket,
    Prefix: completed.S3Prefix,
    MaxKeys: 1,
  })
);
if (!objects.KeyCount) {
  throw new Error("Completed RDS recovery export has no S3 objects");
}

const artifact = {
  schemaVersion: 1,
  validatedAt: new Date().toISOString(),
  exportTaskId: completed.ExportTaskIdentifier,
  exportStatus: completed.Status,
  completedAt: completed.TaskEndTime.toISOString(),
  exportPrefix: completed.S3Prefix,
  ageHours: Number(ageHours.toFixed(2)),
  validation: "RDS export completed and object prefix is non-empty",
};
const body = `${JSON.stringify(artifact)}\n`;
const sha256 = createHash("sha256").update(body).digest("hex");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const key = `recovery-validation-manifests/${timestamp}-${completed.ExportTaskIdentifier}.json`;
await s3.send(
  new PutObjectCommand({
    Bucket: recoveryBucket,
    Key: key,
    Body: body,
    ContentType: "application/json",
    Metadata: { sha256 },
    ServerSideEncryption: "aws:kms",
  })
);

console.log(
  JSON.stringify({
    status: "passed",
    exportTaskId: completed.ExportTaskIdentifier,
    artifactKey: key,
    sha256,
  })
);
