import { CloudTrailClient, Event, LookupEventsCommand, LookupEventsCommandInput } from '@aws-sdk/client-cloudtrail'
import { mockClient } from 'aws-sdk-client-mock'
import { CloudTrailUserEvent } from '../src/CloudTrailUserEvent'
import { CloudTrailUserEventManager } from '../src/CloudTrailUserEventManager'
import { QuickSightUser } from '../src/QuickSightUser'

const cloudTrailMock = mockClient(CloudTrailClient)

const johnSmith = new QuickSightUser({
	Active: true,
	Arn: 'arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-admin-role/john.smith@example.com',
	Email: 'john.smith@example.com',
	PrincipalId: 'federated/iam/ARIAGRGHRGGERHQWOJ:john.smith@example.com',
	UserName: 'quicksight-admin-role/john.smith@example.com',
	Role: 'ADMIN',
})
const johnSmithLatestDate = new Date('2022-05-10T01:02:03')
const johnSmithLatestDateClone = new Date('2022-05-10T01:02:03')
const johnSmithOlderDate = new Date('2022-04-01T11:12:13')

const hannahBanana = new QuickSightUser({
	Active: true,
	Arn: 'arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-author-role/hannah.banana@example.com',
	Email: 'hannah.banana@example.com',
	PrincipalId: 'federated/iam/ARIAGRGHTRHGERHQWOJ:hannah.banana@example.com',
	UserName: 'quicksight-author-role/hannah.banana@example.com',
	Role: 'AUTHOR',
})
const hannahBananaLatestDate = new Date('2022-04-05T14:15:16')
const hannahBananaOlderDate = new Date('2022-01-02T04:05:06')

const sillyBilly = new QuickSightUser({
	Active: true,
	Arn: 'arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-reader/silly.billy@example.com',
	Email: 'silly.billy@example.com',
	PrincipalId: 'federated/iam/ARIAGERHIGWFEHQOFIH:silly.billy@example.com',
	UserName: 'quicksight-reader-role/silly.billy@example.com',
	Role: 'READER',
})

const cloudTrailUserEventManager = new CloudTrailUserEventManager()

const sampleCloudTrailEvents: Event[] = [
	{
		Username: johnSmith.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${johnSmith.iamRoleId}:${johnSmith.email}` },
		}),
		EventTime: johnSmithLatestDate,
	},
	{
		Username: johnSmith.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${johnSmith.iamRoleId}:${johnSmith.email}` },
		}),
		EventTime: johnSmithLatestDateClone,
	},
	{
		Username: hannahBanana.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${hannahBanana.iamRoleId}:${hannahBanana.email}` },
		}),
		EventTime: hannahBananaOlderDate,
	},
	{
		Username: johnSmith.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${johnSmith.iamRoleId}:${johnSmith.email}` },
		}),
		EventTime: johnSmithOlderDate,
	},
	{
		Username: hannahBanana.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${hannahBanana.iamRoleId}:${hannahBanana.email}` },
		}),
		EventTime: hannahBananaLatestDate,
	},
]

// Same as above but in "our" format
const sampleEvents: CloudTrailUserEvent[] = sampleCloudTrailEvents.map((event) => new CloudTrailUserEvent(event))

describe('CloudTrailUserEventManager', () => {
	describe('retrieveQuickSightUserEvents', () => {
	
		afterEach(() => {
			cloudTrailMock.reset()
		})

		it('retrieves one page of events', async () => {
			cloudTrailMock.on(LookupEventsCommand).resolves({ Events: sampleCloudTrailEvents })

			const startDate = new Date('2022-01-02T03:04:05')
			const events = await cloudTrailUserEventManager.retrieveQuickSightUserEvents(startDate)

			expect(cloudTrailMock.calls()).toHaveLength(1)
			expect(cloudTrailMock.call(0).args[0].input).toStrictEqual({
				LookupAttributes: [
					{
						AttributeKey: 'EventSource',
						AttributeValue: 'quicksight.amazonaws.com',
					},
				],
				StartTime: startDate,
				NextToken: null,
			})

			expect(events).toStrictEqual(sampleEvents)
		})

		it('retrieves two pages of events', async () => {
			cloudTrailMock.on(LookupEventsCommand)
				.resolvesOnce({ Events: sampleCloudTrailEvents.slice(0, 2), NextToken: 'GetMoreResults' })
				.resolvesOnce({ Events: sampleCloudTrailEvents.slice(2) })

			const startDate = new Date('2022-01-02T03:04:05')
			const events = await cloudTrailUserEventManager.retrieveQuickSightUserEvents(startDate)
 
			expect(cloudTrailMock.calls()).toHaveLength(2)
	
			const expectedInput: LookupEventsCommandInput = {
				LookupAttributes: [
					{
						AttributeKey: 'EventSource',
						AttributeValue: 'quicksight.amazonaws.com',
					},
				],
				StartTime: startDate,
				NextToken: null,
			}
			expect(cloudTrailMock.call(0).args[0].input).toStrictEqual(expectedInput)
			const expectedInputTwo = { ...expectedInput, NextToken: 'GetMoreResults' }
			expect(cloudTrailMock.call(1).args[0].input).toStrictEqual(expectedInputTwo)
 
			expect(events).toStrictEqual(sampleEvents)
		})

		it('retrieved events that included a non-human user', async () =>{
			// Expect the non-human user is omitted
			const eventsToReturn: Event[] = [...sampleCloudTrailEvents, { ...sampleCloudTrailEvents[0], Username: 'automated-process' }]
			cloudTrailMock.on(LookupEventsCommand).resolves({ Events: eventsToReturn })

			const events = await cloudTrailUserEventManager.retrieveQuickSightUserEvents(new Date(0))

			expect(cloudTrailMock.calls()).toHaveLength(1)

			expect(events).toStrictEqual(sampleEvents)
		})

		it('bubbles up exceptions', async () => {
			const error: Error = { name: 'ItDied', message: 'Ded' }
			cloudTrailMock.on(LookupEventsCommand).rejects(error)

			await expect(cloudTrailUserEventManager.retrieveQuickSightUserEvents(new Date(0))).rejects.toThrow(error)
		})
	})

	describe('getLastAccessDate', () => {
		it('returns 1970 when user has no access date', () => {
			expect(cloudTrailUserEventManager.getLastAccessDate(sillyBilly, sampleEvents)).toStrictEqual(new Date(0))
		})

		it('does not match when user emails are different but IAM role IDs are same', () => {
			const hannahBananaCopy = { ...hannahBanana, email: 'wrong.email@example.com' }
			// Hannah Banana has events but she should not match if her email is wrong
			expect(cloudTrailUserEventManager.getLastAccessDate(hannahBananaCopy, sampleEvents)).toStrictEqual(new Date(0))
		})

		it('does not match when user IAM role IDs are different but emails are same', () => {
			const hannahBananaCopy = { ...hannahBanana, iamRoleId: 'WRONGROLEID' }
			// Hannah Banana has events but she should not match if her IAM role ID is wrong
			expect(cloudTrailUserEventManager.getLastAccessDate(hannahBananaCopy, sampleEvents)).toStrictEqual(new Date(0))
		})

		it('gets the right date when the dates are in order', () => {
			expect(cloudTrailUserEventManager.getLastAccessDate(johnSmith, sampleEvents)).toBe(johnSmithLatestDate)
		})

		it('gets the right date when the dates are in reverse order', () => {
			expect(cloudTrailUserEventManager.getLastAccessDate(hannahBanana, sampleEvents)).toBe(hannahBananaLatestDate)
		})
	})
})