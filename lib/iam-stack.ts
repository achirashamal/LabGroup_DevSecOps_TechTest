import {
  Stack, StackProps, Tags,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface IAMStackProps extends StackProps {
  envName: string;
}

export class IAMStack extends Stack {
  public readonly taskRole: iam.Role;
  public readonly executionRole: iam.Role;
  public readonly secretsAccessPolicy: iam.PolicyStatement;
  public readonly parametersAccessPolicy: iam.PolicyStatement;

  constructor(scope: Construct, id: string, props: IAMStackProps) {
    super(scope, id, props);
    const { envName } = props;

    // Execution Role for ECS task
    this.executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Execution role for tenant management service',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Task Role with least privileges
    this.taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Task role for tenant management service',
    });

    // Secrets Manager permissions
    this.secretsAccessPolicy = new iam.PolicyStatement({
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
    this.parametersAccessPolicy = new iam.PolicyStatement({
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
      resources: ['*'],
    });

    // Attach policies to task role
    this.taskRole.addToPolicy(this.secretsAccessPolicy);
    this.taskRole.addToPolicy(this.parametersAccessPolicy);
    this.taskRole.addToPolicy(logsPolicy);

    Tags.of(this).add('Stack', 'Security');
  }
}