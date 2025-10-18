import {
  Stack, StackProps, Tags,
  aws_ecs as ecs,
  aws_elasticloadbalancingv2 as elbv2,
  aws_cloudwatch as cloudwatch,
  aws_cloudwatch_actions as cw_actions,
  aws_sns as sns,
  aws_sns_subscriptions as subscriptions,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends StackProps {
  envName: string;
  cluster: ecs.Cluster;
  service: ecs.FargateService;
  loadBalancer: elbv2.ApplicationLoadBalancer;
}

export class MonitoringStack extends Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);
    const { envName, cluster, service, loadBalancer } = props;

    // SNS Topic for alerts
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `tenant-mgmt-alarms-${envName}`,
    });

    // Add email subscription (configure email through context)
    const alarmEmail = this.node.tryGetContext('alarmEmail');
    if (alarmEmail) {
      alarmTopic.addSubscription(new subscriptions.EmailSubscription(alarmEmail));
    }

    // ECS Service Metrics and Alarms
    const cpuAlarm = new cloudwatch.Alarm(this, 'HighCPUAlarm', {
      alarmName: `tenant-mgmt-high-cpu-${envName}`,
      alarmDescription: 'ECS Service CPU utilization is too high',
      metric: service.metricCpuUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 1,
      actionsEnabled: true,
    });

    const memoryAlarm = new cloudwatch.Alarm(this, 'HighMemoryAlarm', {
      alarmName: `tenant-mgmt-high-memory-${envName}`,
      alarmDescription: 'ECS Service memory utilization is too high',
      metric: service.metricMemoryUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 1,
      actionsEnabled: true,
    });

    // ALB Metrics and Alarms
    const albResponseTimeAlarm = new cloudwatch.Alarm(this, 'HighALBResponseTime', {
      alarmName: `tenant-mgmt-high-alb-response-${envName}`,
      alarmDescription: 'ALB target response time is too high',
      metric: loadBalancer.metricTargetResponseTime(),
      threshold: 2, // 2 seconds
      evaluationPeriods: 2,
      datapointsToAlarm: 1,
      actionsEnabled: true,
    });

    const http5xxAlarm = new cloudwatch.Alarm(this, 'HTTP5xxAlarm', {
      alarmName: `tenant-mgmt-http-5xx-${envName}`,
      alarmDescription: 'High rate of HTTP 5xx errors',
      metric: loadBalancer.metricHttpCodeElb(elbv2.HttpCodeElb.ELB_5XX_COUNT),
      threshold: 10,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      actionsEnabled: true,
    });

    // Connect alarms to SNS topic
    cpuAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
    memoryAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
    albResponseTimeAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
    http5xxAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));

    // Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `TenantManagement-${envName}`,
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ECS CPU/Memory Utilization',
        left: [service.metricCpuUtilization()],
        right: [service.metricMemoryUtilization()],
      }),
      new cloudwatch.GraphWidget({
        title: 'ALB Metrics',
        left: [loadBalancer.metricRequestCount()],
        right: [loadBalancer.metricTargetResponseTime()],
      }),
      new cloudwatch.GraphWidget({
        title: 'HTTP Responses',
        left: [
          loadBalancer.metricHttpCodeTarget(elbv2.HttpCodeTarget.TARGET_2XX_COUNT),
          loadBalancer.metricHttpCodeTarget(elbv2.HttpCodeTarget.TARGET_4XX_COUNT),
          loadBalancer.metricHttpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT),
        ],
      })
    );

    Tags.of(this).add('Stack', 'Monitoring');
  }
}