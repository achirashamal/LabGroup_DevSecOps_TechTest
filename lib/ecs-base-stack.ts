import {
  Stack, StackProps, Tags, CfnOutput,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_ecs_patterns as ecsPatterns,
  aws_iam as iam,
  aws_logs as logs,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface EcsBaseStackProps extends StackProps {
  envName: string;
}

export class EcsBaseStack extends Stack {
  constructor(scope: Construct, id: string, props: EcsBaseStackProps) {
    super(scope, id, props);
    const { envName } = props;

    // --- Networking / VPC ---
    // Default VPC includes NAT gateways so tasks can pull images, write logs, etc.
    // Creating new VPC for tech test - this would import an existing VPC in an actual deployment
    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

    // --- ECS cluster ---
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // --- IAM roles ---
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Task role for app.',
    });

    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // --- Fargate task definition ---
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole,
      executionRole,
    });

    const logGroup = new logs.LogGroup(this, 'AppLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    taskDef.addContainer('App', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/nginx:stable'),
      portMappings: [{ containerPort: 80 }],
      logging: ecs.LogDriver.awsLogs({ logGroup, streamPrefix: 'app' }),
    });

    // --- ECS service ---
    const svc = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      publicLoadBalancer: true,
      desiredCount: 1,
      listenerPort: 80,
    });

    // --- Tagging ---
    Tags.of(this).add('Project', 'ecs-secrets-ssm');
    Tags.of(this).add('Env', envName);

    // --- Outputs ---
    new CfnOutput(this, 'InternalLoadBalancerDNS', {
      value: svc.loadBalancer.loadBalancerDnsName,
      description: 'Internal ALB DNS (resolvable/accessible only within the VPC)',
    });
    new CfnOutput(this, 'ClusterName', { value: cluster.clusterName });
  }
}
