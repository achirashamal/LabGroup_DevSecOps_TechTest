import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { EcsBaseStack } from '../lib/ecs-base-stack';

test('Synthesizes a Fargate service skeleton', () => {
  const app = new cdk.App();
  const stack = new EcsBaseStack(app, 'Test', { envName: 'dev' });
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::ECS::Cluster', 1);
  template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
});
