import sinon from 'sinon'
import { CloudTrailUserEvent } from '../src/CloudTrailUserEvent'
import { CloudTrailUserEventManager } from '../src/CloudTrailUserEventManager'
import { CloudWatchMetricClient } from '../src/CloudWatchMetricClient'
import { NotificationManager } from '../src/NotificationManager'
import pruneQuickSightUsers from '../src/pruneQuickSightUsers'
import { QuickSightUser } from '../src/QuickSightUser'
import { QuickSightUserManager } from '../src/QuickSightUserManager'

jest.useFakeTimers().setSystemTime(new Date('2022-05-10T13:14:15'))

const stubs = {
	QuickSightUserManager: {
		retrieveUsers: sinon.stub(QuickSightUserManager.prototype, 'retrieveUsers'),
		deleteUser: sinon.stub(QuickSightUserManager.prototype, 'deleteUser'),
	},
	CloudTrailUserEventManager: {
		retrieveQuickSightUserEvents: sinon.stub(CloudTrailUserEventManager.prototype, 'retrieveQuickSightUserEvents'),
		// Intentionally disabling stub since the method will work w/o stubbing: getLastAccessDate: sinon.stub(CloudTrailUserEventManager.prototype, 'getLastAccessDate')	
	},
	NotificationManager: {
		notifyUser: sinon.stub(NotificationManager.prototype, 'notifyUser'),
	},
	CloudWatchMetricClient: {
		queueMetric: sinon.stub(CloudWatchMetricClient.prototype, 'queueMetric'),
		emitQueuedMetrics: sinon.stub(CloudWatchMetricClient.prototype, 'emitQueuedMetrics'),
	},
}

const johnSmith = new QuickSightUser({
	Active: true,
	Arn: 'arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-admin-role/john.smith@example.com',
	Email: 'john.smith@example.com',
	PrincipalId: 'federated/iam/ARIAGRGHRGGERHQWOJ:john.smith@example.com',
	UserName: 'quicksight-admin-role/john.smith@example.com',
	Role: 'ADMIN',
})
const johnSmithLatestDate = new Date()
const johnSmithLatestDateClone = new Date(johnSmithLatestDate)
const johnSmithOlderDate = new Date(johnSmithLatestDate)
johnSmithOlderDate.setDate(johnSmithOlderDate.getDate() - 3)

const hannahBanana = new QuickSightUser({
	Active: true,
	Arn: 'arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-author-role/hannah.banana@example.com',
	Email: 'hannah.banana@example.com',
	PrincipalId: 'federated/iam/ARIAGRGHTRHGERHQWOJ:hannah.banana@example.com',
	UserName: 'quicksight-author-role/hannah.banana@example.com',
	Role: 'AUTHOR',
})
const hannahBananaLatestDate = new Date()
hannahBananaLatestDate.setDate(hannahBananaLatestDate.getDate() - 25)
const hannahBananaOlderDate = new Date(hannahBananaLatestDate)
hannahBananaOlderDate.setDate(hannahBananaOlderDate.getDate() - 30)

const sillyBilly = new QuickSightUser({
	Active: true,
	Arn: 'arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-reader/silly.billy@example.com',
	Email: 'silly.billy@example.com',
	PrincipalId: 'federated/iam/ARIAGERHIGWFEHQOFIH:silly.billy@example.com',
	UserName: 'quicksight-reader-role/silly.billy@example.com',
	Role: 'READER',
})

const validQuickSightUsers = [johnSmith, hannahBanana, sillyBilly]

const sampleCloudTrailEvents: CloudTrailUserEvent[] = [
	new CloudTrailUserEvent({
		Username: johnSmith.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${johnSmith.iamRoleId}:${johnSmith.email}` },
		}),
		EventTime: johnSmithLatestDate,
	}),
	new CloudTrailUserEvent({
		Username: johnSmith.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${johnSmith.iamRoleId}:${johnSmith.email}` },
		}),
		EventTime: johnSmithLatestDateClone,
	}),
	new CloudTrailUserEvent({
		Username: hannahBanana.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${hannahBanana.iamRoleId}:${hannahBanana.email}` },
		}),
		EventTime: hannahBananaOlderDate,
	}),
	new CloudTrailUserEvent({
		Username: johnSmith.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${johnSmith.iamRoleId}:${johnSmith.email}` },
		}),
		EventTime: johnSmithOlderDate,
	}),
	new CloudTrailUserEvent({
		Username: hannahBanana.email,
		CloudTrailEvent: JSON.stringify({
			userIdentity: { principalId: `${hannahBanana.iamRoleId}:${hannahBanana.email}` },
		}),
		EventTime: hannahBananaLatestDate,
	}),
]

beforeEach(() => {
	process.env = {
		...process.env,
		deleteDays: '30',
		notifyDays: '25',
		enableNotification: 'true',
	}
})

afterEach(() => {
	sinon.reset()
})

describe('pruneQuickSightUsers', () => {
	it('works when there are no users', async () => {
		stubs.QuickSightUserManager.retrieveUsers.resolves([])
		await pruneQuickSightUsers()

		sinon.assert.calledOnce(stubs.QuickSightUserManager.retrieveUsers)
	})

	it('works when it needs to delete a user and notify another user', async () => {
		stubs.QuickSightUserManager.retrieveUsers.resolves(validQuickSightUsers)
		stubs.CloudTrailUserEventManager.retrieveQuickSightUserEvents.resolves(sampleCloudTrailEvents)

		await pruneQuickSightUsers()

		const expectedDeleteDate = new Date()
		expectedDeleteDate.setDate(expectedDeleteDate.getDate() - 30)

		sinon.assert.calledOnce(stubs.QuickSightUserManager.retrieveUsers)
		sinon.assert.calledOnceWithExactly(stubs.CloudTrailUserEventManager.retrieveQuickSightUserEvents, expectedDeleteDate)
		sinon.assert.calledOnceWithExactly(stubs.QuickSightUserManager.deleteUser, sillyBilly)
		sinon.assert.calledOnceWithExactly(stubs.NotificationManager.notifyUser, hannahBanana)

		sinon.assert.callCount(stubs.CloudWatchMetricClient.queueMetric, 5)
		sinon.assert.calledWith(stubs.CloudWatchMetricClient.queueMetric.firstCall, { MetricName: 'PriorQuickSightUsersCount', Value: validQuickSightUsers.length })
		sinon.assert.calledWith(stubs.CloudWatchMetricClient.queueMetric.secondCall, { MetricName: 'InvalidUsersCount', Value: 0 })
		sinon.assert.calledWith(stubs.CloudWatchMetricClient.queueMetric.thirdCall, { MetricName: 'UsersDeletedCount', Value: 1 })
		sinon.assert.calledWith(stubs.CloudWatchMetricClient.queueMetric.getCalls()[3], { MetricName: 'NotificationsSentCount', Value: 1 })
		sinon.assert.calledWith(stubs.CloudWatchMetricClient.queueMetric.getCalls()[4], { MetricName: 'RemainingQuickSightUsersCount', Value: validQuickSightUsers.length - 1 })
	})

	it('does not notify readers', async () => {
		stubs.QuickSightUserManager.retrieveUsers.resolves(validQuickSightUsers)

		const notifyDate = new Date()
		notifyDate.setDate(notifyDate.getDate() - 25)

		stubs.CloudTrailUserEventManager.retrieveQuickSightUserEvents.resolves([
			{
				email: sillyBilly.email, 
				iamRoleId: sillyBilly.iamRoleId,
				eventTime: notifyDate,
			},
		])

		await pruneQuickSightUsers()

		sinon.assert.notCalled(stubs.NotificationManager.notifyUser)
	})

	it('does not notify when notification is disabled', async () => {
		process.env.enableNotification = 'false'

		stubs.QuickSightUserManager.retrieveUsers.resolves(validQuickSightUsers)
		stubs.CloudTrailUserEventManager.retrieveQuickSightUserEvents.resolves(sampleCloudTrailEvents)

		await pruneQuickSightUsers()

		sinon.assert.notCalled(stubs.NotificationManager.notifyUser)
	})

	it('detects invalid users', async () => {
		const oneInvalidQuickSightUser = [new QuickSightUser({
			Active: true,
			Arn: 'arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-reader/bad.user@example.com',
			Email: 'bad.user@example.com',
			PrincipalId: 'federated/iam/ARIAGERHIGWFEHQOFIH:bad.user@example.com',
			UserName: 'N/A',
			Role: 'READER',
		})]

		stubs.QuickSightUserManager.retrieveUsers.resolves(oneInvalidQuickSightUser)
		stubs.CloudTrailUserEventManager.retrieveQuickSightUserEvents.resolves(sampleCloudTrailEvents)

		await pruneQuickSightUsers()

		sinon.assert.calledWithExactly(stubs.CloudWatchMetricClient.queueMetric, { MetricName: 'InvalidUsersCount', Value: 1 })
	})

	it('does not delete someone right at deletion day, only after deletion day', async () => {
		const oneUserOnVergeOfDeletion = [new QuickSightUser({
			Active: true,
			Arn: 'arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-reader/silly.billy@example.com',
			Email: 'silly.billy@example.com',
			PrincipalId: 'federated/iam/ARIAGERHIGWFEHQOFIH:silly.billy@example.com',
			UserName: 'silly.billy@example.com',
			Role: 'READER',
		})]

		const exactDeletionDate = new Date()
		exactDeletionDate.setDate(exactDeletionDate.getDate() - 30)
		const cloudTrailEvents: CloudTrailUserEvent[] = [
			{
				email: 'silly.billy@example.com',
				iamRoleId: 'ARIAGERHIGWFEHQOFIH',
				eventTime: exactDeletionDate,
			},
		]

		stubs.QuickSightUserManager.retrieveUsers.resolves(oneUserOnVergeOfDeletion)
		stubs.CloudTrailUserEventManager.retrieveQuickSightUserEvents.resolves(cloudTrailEvents)

		await pruneQuickSightUsers()

		sinon.assert.notCalled(stubs.QuickSightUserManager.deleteUser)
	})
})