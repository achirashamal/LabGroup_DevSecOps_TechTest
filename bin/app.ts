import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcsBaseStack } from '../lib/ecs-base-stack';

const app = new cdk.App();

const envName = app.node.tryGetContext('env') ?? 'dev';

new EcsBaseStack(app, `EcsBase-${envName}`, {
  envName,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
