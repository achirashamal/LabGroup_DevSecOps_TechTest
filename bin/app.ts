import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VPCStack } from '../lib/vpc-stack';
import { ServiceStack } from '../lib/service-stack';
import { EcsBaseStack } from '../lib/ecs-base-stack';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

const envName = app.node.tryGetContext('env') ?? 'dev';
const vpcCidr = app.node.tryGetContext('vpcCidr') ?? '10.0.0.0/16';
const desiredCount = app.node.tryGetContext('desiredCount') ?? 2;
const cpu = app.node.tryGetContext('cpu') ?? 256;
const memory = app.node.tryGetContext('memory') ?? 512;

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



const serviceStack = new ServiceStack(app, `ServiceStack-${envName}`, {
  ...commonProps,
  envName,
  vpc: vpcStack.vpc,
  desiredCount,
  cpu,
  memory,
});

// serviceStack.addDependency(vpcStack);
// serviceStack.addDependency(iamStack);



// new EcsBaseStack(app, `EcsBase-${envName}`, {
//   envName,
//   env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
// });
