import { Event } from '@aws-sdk/client-cloudtrail'

export class CloudTrailUserEvent {
	// arn:aws:sts::account:assumed-role/ROLE_NAME/SESSION_NAME
	iamRole: string 
	stsSession: string 
	eventTime: Date

	constructor(event: Event) {
		const cloudTrailEvent = JSON.parse(event.CloudTrailEvent)
		// TODO: What about IAM user logins?
		const [role, session] =  cloudTrailEvent.userIdentity.arn.split('/').slice(1) // arn:aws:sts::account:assumed-role/ROLE_NAME/SESSION_NAME
		
		this.iamRole = role
		this.stsSession = session
		this.eventTime = event.EventTime
	}
}