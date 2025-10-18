# Getting Started
1. Clone or unpack the provided base project.
2. Install dependencies and synth:
    Note - Deployment to an AWS environment is not required for this test
    ```
    npm install
    npm run build
    npx cdk synth
    ```
3. Ensure tests run:
    ```
    npm test
    ```
4. Use this base stack to extend functionality. You are free to:
    - Introduce new constructs or stacks.
    - Add context/config parameters.
    - Modify task roles and policies.
    - Create supporting AWS resources as needed.

# Scenario
LAB would like to create a tenant management service that acts as a central service for administration of configuration for other ECS services. This will require the running service to be able to create and manage AWS Secrets Manager secrets and SSM Parameter Store parameters for other applications. Access must be tightly scoped (least-privilege) and auditable. Additionally, as this service is for administration of internal applications, this service should only be accessible from within the VPC

You’ll start with a pre-built ECS stack that deploys a simple publicly accessible Fargate service.

Your task is to extend the stack to meet the new requirements, making use of your understanding of the AWS Well-Architected framework. Consider any other AWS resources that you think would be good to add to a service like this.

While working on this test, initialise a new git repository so that we can track your commit cadence and commit messages

## Deliverables

* Your updated CDK application (TypeScript).
    * Should successfully synthesize, deployment to an AWS environment will not be performed
* An updated README that explains:
    * What you changed and why.
    * How your solution meets the requirements and Well-Architected considerations.
    * How to deploy and test, including expected success and denied cases.
    * Any assumptions and trade-offs.
    * Answers to the questions (below).
* Unit tests verifying your changes.
* Your .git folder, showing your commit history

## Questions:

* What are the security best practices that you have applied in your implementation?
* How are you managing encryption for resources that are accessed by multiple applications?
* Are there any configurations that you think should be applied to other applications that use resources created by this service? What are they and why would you suggest them?
* How would you track access attempts/changes/failures/misuse of this application?
* What else (beyond the direct requirements) would you/have you added to this application stack to improve it? (Include anything that you haven't added due to time constraints

Timebox

Aim for 1-2 hours. Focus on correctness, clarity, and judgment over completeness.


## Answers:

1. **What you changed and why?**  
   Created separate VPC and monitoring stacks for better maintainability and reusability as the application scales. Converted public access to VPC-restricted access to enforce network-level restrictions. Used VPC endpoints instead of NAT gateways to reduce costs and prevent data from traversing public networks. Created fine-grained IAM policies to adhere to least-privilege practices. Enabled auto-scaling, health checks, and monitoring to maintain high reliability

2. **How your solution meets the requirements and Well-Architected considerations.?**  
   - Operational Excellence : Container Insights, health checks, and auto-scaling ensure reliable service operation.
   - Security : Least privilege IAM and internal-only VPC access enforce strict security boundaries.
   - Reliability : Multi-AZ deployment with auto-scaling and health checks provides fault tolerance.
   - Performance Efficiency: Fargate with configurable CPU/memory and auto-scaling optimizes resource usage.
   - Cost Optimization: No NAT gateways and VPC endpoints reduce operational costs.
   - Sustainability: Auto-scaling and serverless Fargate minimize resource waste and energy consumption.

3. **How to deploy and test, including expected success and denied cases?**  

 - Deploy
    ```
    cdk deploy --context env=dev --context desiredCount=2
    ```
 - Test for success : SSH to a EC2 with in the VPC and run curl command to resolve healthcheck endpoint

 - Test for network isolation :  run curl command to resolve healthcheck endpoint from a server outside the VPC

4. **Any assumptions and trade-offs?**  
- No internet access need for the application code during initialisation or runtime
- Using Fargate reduces operational effort, but if EC2 were used instead, the cost would be considerably lower (with saving plans).
- The services that use this application are either in the same VPC or connected through VPC peering or other methods.

5. **What are the security best practices that you have applied in your implementation?**  
- Least privilege IAM 
- Network Isolated resources
- Utilising VPC endpoints to prevent public data flow

6. **How are you managing encryption for resources that are accessed by multiple applications?**
Can improve this stack to use KMS key (Key policies with cross-account access if needed). Set IAM conditions based on environment ( dev/test/prod). And enabled automatic key rotation.

7. **Are there any configurations that you think should be applied to other applications that use resources created by this service? What are they and why would you suggest them?**
   Other applications should be in same VPC or other VPCs need to be conneted to this VPC. Can utilise VPC peering , Transit gateways or Site-to-Site connections to enable connection between multiple VPCs. 

8. **How would you track access attempts/changes/failures/misuse of this application?**
   Use created Cloudwatch dashboard to monitor failures. Use AWS CloudTrail / Config / SecurityHub to audit changes to resources of this stack. Monitor VPC flowlogs

9. **What else (beyond the direct requirements) would you/have you added to this application stack to improve it?**
- Use KMS to encrypt Cloudwatch Logs
- Utilise service discovery and AWS Cloud Map API instead of loadbalancer DNS to maintain readable urls and avoid issues with loadbalancer IP changes
- Host this stack in a sperate Operations AWS Account
- Improve tagging based on cost centers to monitor cost


