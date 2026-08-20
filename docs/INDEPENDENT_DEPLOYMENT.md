# Independent Deployment Readiness

## Selected Target Architecture

THE VAULT now contains **configuration-gated, provider-neutral seams** for an AWS-centered deployment. Production remains on its current managed integrations until the account owner provisions and binds the required external resources. This sequencing prevents an unconfigured provider migration from interrupting the deployed experience.

| Capability | Independent target | Repository control | Account-owner action required |
| --- | --- | --- | --- |
| Staging database | Isolated Amazon RDS MySQL instance, distinct from production | Staging preflight, migration, and rollback-drill scripts | Create RDS instance/database, network access, and an isolated `STAGING_DATABASE_URL` |
| Browser authentication | Cognito-compatible OIDC authorization-code flow | Server-owned login/callback, discovery, token/JWKS verification, app session issuance | Create user pool/client/domain and register the exact callback URL |
| Object storage | Private S3-compatible bucket and short-lived presigned downloads | `STORAGE_PROVIDER=s3` adapter behind existing `/manus-storage/*` paths | Create bucket, KMS policy, and application workload identity |
| Recovery validation | RDS manual snapshot plus immutable S3 manifest with checksum | Scheduled GitHub workflow and `recovery:validate` command | Create GitHub-to-AWS OIDC trust and least-privilege recovery role |

## Activation Order

First provision the staging RDS database, then bind `STAGING_DATABASE_URL` outside the repository and run `pnpm staging:preflight`, `pnpm staging:migrate`, and `pnpm staging:failure-drill`. The preflight command rejects a matching production URL and requires `DEPLOYMENT_ENV=staging`.

Next configure the OIDC application. Set `AUTH_PROVIDER=oidc`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and the exact HTTPS `OIDC_REDIRECT_URI`. The server performs discovery, authorization-code exchange, and ID-token verification against the issuer and JWKS. Existing Manus identities and new OIDC identities use different stable identifiers; a verified-email account-linking migration must be explicitly approved before any historic-user merge.

Then configure `STORAGE_PROVIDER=s3`, `S3_REGION`, and `S3_BUCKET`. The application uses the standard AWS credential provider chain, so use an IAM workload role rather than static access keys. Existing client-visible storage routes remain compatible.

Finally create a GitHub Actions OIDC role restricted to `Themeta-verse/The-Vault` on `main`, add the non-secret repository variables named in `recovery-validation.yml`, and protect the `production-recovery` environment with required reviewers. The workflow creates an RDS manual snapshot, waits for `available`, starts a KMS-encrypted RDS export to the recovery S3 bucket, then validates the newest completed export by checking status, freshness, and non-empty object prefix before writing a checksum-bearing manifest. No database credentials are stored in the repository.

## Recovery Boundary

The automated job validates snapshot creation, RDS export initiation, the newest completed export's freshness, the non-empty S3 export prefix, manifest write, and SHA-256 integrity metadata. It does **not** perform a paid restore drill automatically. A quarterly restore-to-disposable-RDS procedure remains an account-owner action because it creates billable resources and requires a pre-approved isolation, data-access, and deletion plan.

## References

[1]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-flow.html "Amazon Cognito OIDC user-pool flow"
[2]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html "Amazon RDS DB snapshots"
[3]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html "Amazon S3 presigned URLs"
[4]: https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/ "AWS Security Blog: GitHub Actions OIDC"
