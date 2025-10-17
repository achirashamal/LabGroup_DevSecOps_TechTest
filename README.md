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