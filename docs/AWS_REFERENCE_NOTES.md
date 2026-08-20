# AWS Reference Notes

These implementation notes preserve the externally verified design assumptions used for the AWS-centered portability path. They are operational references, not credentials or deployment instructions.

| Concern | Verified design point | Source |
| --- | --- | --- |
| Browser identity | Amazon Cognito supports the OAuth/OIDC authorization-code model, and token claims are validated against issuer, audience, expiry, and the provider JWKS. The application should use a server-owned callback and issue its own session after validation. | [Cognito OIDC flow](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-flow.html) |
| Database recovery | RDS snapshots cover the DB instance; manual snapshots do not expire under automated-backup retention, and AWS recommends snapshot export to S3 for long-term MySQL/MariaDB/PostgreSQL recovery retention. | [RDS snapshots](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html) |
| Object access | S3 objects are private by default and presigned URLs provide time-limited access. The application should preserve its authenticated redirect boundary and issue short-lived URLs server-side. | [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html) |
| Scheduled recovery jobs | GitHub Actions can assume narrowly scoped AWS IAM roles through OIDC and short-lived credentials, avoiding long-lived AWS access keys in repository secrets. | [AWS Security Blog: GitHub Actions OIDC](https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/) |

The required account-level actions remain intentionally gated: create isolated RDS staging/production instances, create private S3 buckets and KMS/IAM policies, create a Cognito user-pool client with the deployed callback URL, and scope a GitHub OIDC role to this repository and branch.
