import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VPCStack } from '../lib/vpc-stack';
import { EcsBaseStack } from '../lib/ecs-base-stack';

const app = new cdk.App();

//
const envName = app.node.tryGetContext('env') ?? 'dev';
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

const vpcCidr = app.node.tryGetContext('vpcCidr') ?? '10.0.0.0/16';

const commonProps = {
  env: { account, region },
  tags: {
    Environment: envName,
    Project: 'tenant-management-service',
    Team: 'platform'
  }
};

const vpcStack = new VPCStack(app, `VPCStack-${envName}`, {
  ...commonProps,
  envName,
  vpcCidr,
});

// new EcsBaseStack(app, `EcsBase-${envName}`, {
//   envName,
//   env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
// });
