import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail'
import { CloudTrailUserEvent } from './CloudTrailUserEvent'
import { QuickSightUser } from './QuickSightUser'

export class CloudTrailUserEventManager {
	private cloudTrailClient = new CloudTrailClient({})

	// Filters out events that do not originate with someone's e-mail address
	// such as any automated process which touches QuickSight, including this one
	public async retrieveQuickSightUserEvents(startDate: Date): Promise<CloudTrailUserEvent[]> {
		const events: CloudTrailUserEvent[] = []

		let nextToken: string = null // This is annoying; null doesn't work in the QuickSight API but empty string doesn't work in the CloudTrail API
		do {
			const lookupEventsCommand = new LookupEventsCommand({
				LookupAttributes: [
					{
						AttributeKey: 'EventSource',
						AttributeValue: 'quicksight.amazonaws.com',
					},
				],
				StartTime: startDate,
				NextToken: nextToken,
			})

			const lookupEventsResult = await this.cloudTrailClient.send(lookupEventsCommand)

			nextToken = lookupEventsResult.NextToken

			// Filter out users who do not have an @ sign in the name, this limiting events to only
			// those that were user-initiated (e-mail address)
			const filteredEvents = lookupEventsResult.Events.filter((event) => event.Username.includes('@'))

			for (const event of filteredEvents) {
				events.push(new CloudTrailUserEvent(event))
			}
		} while (nextToken)

		return events
	}

	public getLastAccessDate(user: QuickSightUser, events: CloudTrailUserEvent[]): Date {
		const thisParticularUserEvents = events.filter((event) => event.email === user.email && event.iamRoleId === user.iamRoleId)

		if (thisParticularUserEvents.length === 0) {
			return new Date(0) // Return 1970 as last access date to make logic easier down the road
		}

		// Sort newest to oldest
		return thisParticularUserEvents.sort((a, b) => a.eventTime <= b.eventTime ? 1 : -1)[0].eventTime
	}
}