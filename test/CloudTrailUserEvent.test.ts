import { Event } from '@aws-sdk/client-cloudtrail'
import { CloudTrailUserEvent } from '../src/CloudTrailUserEvent'

const validEvent: Event = {
	CloudTrailEvent: JSON.stringify({ userIdentity: { arn: 'arn:aws:sts::1234567890:assumed-role/my-role/my-session' } }),
	EventTime: new Date('2022-01-02T03:04:05Z'),
}

describe('CloudTrailUserEvent', () => {
	describe('succeeds when', () => {
		it('gets a valid event', () => {
			expect(new CloudTrailUserEvent(validEvent)).toMatchInlineSnapshot(`
CloudTrailUserEvent {
  "eventTime": 2022-01-02T03:04:05.000Z,
  "iamRole": "my-role",
  "stsSession": "my-session",
}
`)
		})
	})
})