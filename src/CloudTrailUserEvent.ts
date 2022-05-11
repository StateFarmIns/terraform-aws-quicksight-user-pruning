import { Event } from '@aws-sdk/client-cloudtrail'

export class CloudTrailUserEvent {
	iamRoleId: string // ASIAGREHGHTHRTH3XJG12
	email: string
	eventTime: Date

	constructor(event: Event) {
		const cloudTrailEvent = JSON.parse(event.CloudTrailEvent)
		const [iamRoleId, email] = cloudTrailEvent.userIdentity.principalId.split(':')

		this.iamRoleId = iamRoleId
		this.email = email
		this.eventTime = event.EventTime
	}
}