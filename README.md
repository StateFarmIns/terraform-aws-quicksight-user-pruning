# Overview

QuickSight behaves differently than many other AWS services. When you log in to the AWS console, State Farm isn't charged. State Farm is only charged for usage.

Not so in the QuickSight console. When you login, you are asked for your e-mail address. Upon submitting, you create yourself as an author. Your account is charged [$24/month](https://aws.amazon.com/quicksight/pricing/) in perpetuity.

This results in a gradual upward trend in QuickSight costs.

In August, we implemented automatic user pruning with this Terraform module. Costs dropped precipitously. Not only that, but users were able to scale up/down as needed, and costs would adjust accordingly rather than continue to increase.

After deploying this module, you will have a Lambda that runs daily (or on a schedule of your choosing -- but keep in mind it is designed to run daily with the way notifications are designed). The Lambda compares CloudTrail events to current QuickSight users. It notifies users when they haven't been used for exactly 30 days (by default) and deletes them when they haven't been used in 45 or more days (by default). This will save you big chunks of money. No underlying resources are touched (yet). If a user makes a dashboard and that user is deleted, then it makes no difference. Other users with access still have access, and the original user may regain access by logging in again.