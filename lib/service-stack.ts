import {
  Stack, StackProps, Tags, CfnOutput, Duration,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_ecs_patterns as ecsPatterns,
  aws_elasticloadbalancingv2 as elbv2,
  aws_iam as iam,
  aws_logs as logs,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ServiceStackProps extends StackProps {
  envName: string;
  vpc: ec2.Vpc;
  desiredCount: number;
  cpu: number;
  memory: number;
}

export class ServiceStack extends Stack {
  public readonly service: ecs.FargateService;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);
    const {
      envName,
      vpc,
      desiredCount,
      cpu,
      memory,
    } = props;

    // Security Group for the service
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc,
      description: 'Security group for tenant management service',
      allowAllOutbound: true,
    });

    // Only allow internal traffic
    serviceSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(80),
      'Allow HTTP from within VPC'
    );

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsights: true,
    });

    // Log Group
    const logGroup = new logs.LogGroup(this, 'AppLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
    });

    // Execution Role for ECS task
    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Execution role for tenant management service',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Task Role 
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Task role for tenant management service',
    });

    // Secrets Manager permissions
    const secretsAccessPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:CreateSecret',
        'secretsmanager:GetSecretValue',
        'secretsmanager:PutSecretValue',
        'secretsmanager:UpdateSecret',
        'secretsmanager:DescribeSecret',
        'secretsmanager:TagResource',
      ],
      resources: [
        `arn:aws:secretsmanager:${this.region}:${this.account}:secret:tenant-*`,
        `arn:aws:secretsmanager:${this.region}:${this.account}:secret:app-*`,
      ],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': this.region,
        },
      },
    });

    // SSM Parameter Store access policies
    const parametersAccessPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:PutParameter',
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParametersByPath',
        'ssm:DescribeParameters',
        'ssm:AddTagsToResource',
      ],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/tenant/*`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/app/*`,
      ],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': this.region,
        },
      },
    });

    // CloudWatch permissions
    const logsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
      ],
      resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/ecs/tenant-mgmt-*`],
    });

    // Attach policies to task role
    taskRole.addToPolicy(secretsAccessPolicy);
    taskRole.addToPolicy(parametersAccessPolicy);
    taskRole.addToPolicy(logsPolicy);

    // Task Definition
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu,
      memoryLimitMiB: memory,
      taskRole,
      executionRole,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // Container
    const container = taskDef.addContainer('App', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/nginx:stable'),
      portMappings: [{ containerPort: 80 }],
      logging: ecs.LogDriver.awsLogs({
        logGroup,
        streamPrefix: 'tenant-mgmt-service',
      }),
      environment: {
        ENVIRONMENT: envName,
        AWS_REGION: this.region,
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost/ || exit 1'], // need to point to actual healthcheck path
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        retries: 3,
        startPeriod: Duration.seconds(60),
      },
    });

    // Fargate Service with internal load balancer
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      publicLoadBalancer: false, 
      desiredCount,
      listenerPort: 80,
      assignPublicIp: false,
      healthCheckGracePeriod: Duration.seconds(60),
      securityGroups: [serviceSecurityGroup],
    });

    this.service = fargateService.service;
    this.loadBalancer = fargateService.loadBalancer;
    this.cluster = cluster;

    // Configure target group health checks
    fargateService.targetGroup.configureHealthCheck({
      path: '/',
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // Auto Scaling
    const scaling = fargateService.service.autoScaleTaskCount({
      minCapacity: desiredCount,
      maxCapacity: 6,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60),
    });

    Tags.of(this).add('Stack', 'Service');
    Tags.of(fargateService.service).add('Service', 'tenant-management');

    new CfnOutput(this, 'LoadBalancerDNS', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: 'Internal ALB DNS',
    });

    new CfnOutput(this, 'ClusterName', { 
      value: cluster.clusterName,
      description: 'ECS Cluster name'
    });
  }
}