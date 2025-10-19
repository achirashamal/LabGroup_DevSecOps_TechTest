import {
  Stack, StackProps, Tags, CfnOutput,
  aws_kms as kms,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface KMSStackProps extends StackProps {
  envName: string;
}

export class KMSStack extends Stack {
  public readonly secretsKey: kms.Key;

  constructor(scope: Construct, id: string, props: KMSStackProps) {
    super(scope, id, props);
    const { envName } = props;

    // Creating KMS key
    this.secretsKey = new kms.Key(this, 'SecretsKey', {
      description: `KMS Key for Tenant Management Service secrets and parameters - ${envName}`,
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          // Allow root user
          new iam.PolicyStatement({
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),

          // Allow tenant management service 
          new iam.PolicyStatement({
            principals: [new iam.AnyPrincipal()],
            actions: [
              'kms:Encrypt',
              'kms:Decrypt',
              'kms:ReEncrypt*',
              'kms:GenerateDataKey*',
              'kms:DescribeKey',
            ],
            resources: ['*'],
            conditions: {
              'ArnLike': {
                'aws:PrincipalArn': `arn:aws:iam::${this.account}:role/*tenant-mgmt*`,
              },
            },
          }),

          // Allow AWS Services 
          new iam.PolicyStatement({
            principals: [new iam.AnyPrincipal()],
            actions: [
              'kms:Decrypt',
              'kms:DescribeKey',
            ],
            resources: ['*'],
            conditions: {
              'StringEquals': {
                'kms:ViaService': `secretsmanager.${this.region}.amazonaws.com`,
                'kms:CallerAccount': this.account,
              },
            },
          }),

          // Allow SSM to use the key
          new iam.PolicyStatement({
            principals: [new iam.AnyPrincipal()],
            actions: [
              'kms:Decrypt',
              'kms:DescribeKey',
            ],
            resources: ['*'],
            conditions: {
              'StringEquals': {
                'kms:ViaService': `ssm.${this.region}.amazonaws.com`,
                'kms:CallerAccount': this.account,
              },
            },
          }),
        ],
      }),
    });

    // Alias
    this.secretsKey.addAlias(`alias/tenant-mgmt-key-${envName}`);

    Tags.of(this).add('Stack', 'KMS');
    Tags.of(this.secretsKey).add('Name', `tenant-mgmt-vpc-${envName}`);

    new CfnOutput(this, 'SecretsKeyId', {
      value: this.secretsKey.keyId,
      description: 'KMS Key ID for tenant management secrets',
    });

    new CfnOutput(this, 'SecretsKeyArn', {
      value: this.secretsKey.keyArn,
    });
  }
}