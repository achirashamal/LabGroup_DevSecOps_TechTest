import { Template, Match } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { VPCStack } from '../lib/vpc-stack';
import { ServiceStack } from '../lib/service-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

describe('Test Tenant Management Service Stacks', () => {
  let app: cdk.App;
  let vpcStack: VPCStack;
  let serviceStack: ServiceStack;
  let monitoringStack: MonitoringStack;

  beforeAll(() => {
    app = new cdk.App({
      context: {
        env: 'test',
        vpcCidr: '10.0.0.0/16',
        desiredCount: 2,
        cpu: 256,
        memory: 512,
      }
    });

    vpcStack = new VPCStack(app, 'VPCStack', {
      envName: 'test',
      vpcCidr: '10.0.0.0/16',
      env: { account: '123456789012', region: 'us-east-1' },
    });

    serviceStack = new ServiceStack(app, 'ServiceStack', {
      envName: 'test',
      vpc: vpcStack.vpc,
      desiredCount: 2,
      cpu: 256,
      memory: 512,
      env: { account: '123456789012', region: 'us-east-1' },
    });

    monitoringStack = new MonitoringStack(app, 'MonitoringStack', {
      envName: 'test',
      cluster: serviceStack.cluster,
      service: serviceStack.service,
      loadBalancer: serviceStack.loadBalancer,
      env: { account: '123456789012', region: 'us-east-1' },
    });
  });

  test('VPC Stack', () => {
    const template = Template.fromStack(vpcStack);

    template.resourceCountIs('AWS::EC2::VPC', 1);
     template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: 'com.amazonaws.us-east-1.secretsmanager'
    });
  });

  test('Service Stack creates ECS service with IAM roles', () => {
    const template = Template.fromStack(serviceStack);

    template.resourceCountIs('AWS::ECS::Cluster', 1);
    template.resourceCountIs('AWS::ECS::Service', 1);
    template.resourceCountIs('AWS::IAM::Role', 2);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internal'
    });
  });

  test('Monitoring Stack creates alarms and dashboard', () => {
    const template = Template.fromStack(monitoringStack);

    template.resourceCountIs('AWS::CloudWatch::Alarm', 4);
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    template.resourceCountIs('AWS::SNS::Topic', 1);
  });

  test('Service have proper tagging', () => {
    const serviceTemplate = Template.fromStack(serviceStack);

    serviceTemplate.hasResourceProperties('AWS::ECS::Service', {
        Tags: Match.arrayWith([
          Match.objectLike({
            Key: 'Service',
            Value: 'tenant-management'
          })
        ])
      });
  });
});