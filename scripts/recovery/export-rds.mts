import {
  CreateDBSnapshotCommand,
  DescribeDBSnapshotsCommand,
  RDSClient,
  StartExportTaskCommand,
  waitUntilDBSnapshotAvailable,
} from "@aws-sdk/client-rds";

const region = process.env.AWS_REGION;
const instanceId = process.env.RDS_PRODUCTION_INSTANCE_ID;
const recoveryBucket = process.env.RECOVERY_ARTIFACT_BUCKET;
const exportRoleArn = process.env.RDS_EXPORT_ROLE_ARN;
const exportKmsKeyId = process.env.RDS_EXPORT_KMS_KEY_ID;
if (
  !region ||
  !instanceId ||
  !recoveryBucket ||
  !exportRoleArn ||
  !exportKmsKeyId
) {
  throw new Error(
    "AWS_REGION, RDS_PRODUCTION_INSTANCE_ID, RECOVERY_ARTIFACT_BUCKET, RDS_EXPORT_ROLE_ARN, and RDS_EXPORT_KMS_KEY_ID are required"
  );
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").toLowerCase();
const snapshotId = `the-vault-recovery-${timestamp}`;
const exportTaskId = `the-vault-export-${timestamp}`;
const exportPrefix = `rds-exports/${timestamp}`;
const rds = new RDSClient({ region });

await rds.send(
  new CreateDBSnapshotCommand({
    DBInstanceIdentifier: instanceId,
    DBSnapshotIdentifier: snapshotId,
  })
);
await waitUntilDBSnapshotAvailable(
  { client: rds, maxWaitTime: 60 * 60 },
  { DBSnapshotIdentifier: snapshotId }
);
const snapshot = await rds.send(
  new DescribeDBSnapshotsCommand({ DBSnapshotIdentifier: snapshotId })
);
const sourceArn = snapshot.DBSnapshots?.[0]?.DBSnapshotArn;
if (!sourceArn)
  throw new Error("Available recovery snapshot has no source ARN");

await rds.send(
  new StartExportTaskCommand({
    ExportTaskIdentifier: exportTaskId,
    SourceArn: sourceArn,
    S3BucketName: recoveryBucket,
    S3Prefix: exportPrefix,
    IamRoleArn: exportRoleArn,
    KmsKeyId: exportKmsKeyId,
  })
);

console.log(
  JSON.stringify({
    status: "started",
    snapshotId,
    exportTaskId,
    exportPrefix,
  })
);
